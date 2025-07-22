import { TableQueries } from '@/@types/common'
import ApiService from './ApiService'
import WooCommerceApiService from './WooCommerceService'
import { LicenseOrder } from '@/views/website/OrderList/store'
import { SalesOrderDetailsResponse } from '@/views/website/OrderDetails/OrderDetails'
import { collection, doc, getDoc, getDocs, getDocsFromCache, query, QueryConstraint, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/firebase'
import { ProductFilterQueries } from '@/views/products/ProductList/store/productListSlice'
import { Product } from '@/@types/product'
import { filter } from 'lodash'
import { table } from 'console'
import { EtsyOrder, EtsyOrderItem } from '@/@types/etsy_order'
import { DashboardQuery, RevenueDashboardData } from '@/views/stats/Revenue/store'
import { COLOR_1, COLOR_2, COLOR_4 } from '@/constants/chart.constant'

function alignSeriesToCategories(
    allCategories: string[],
    seriesDates: string[],
    seriesData: number[]
): number[] {
    const dateToValue: Record<string, number> = {}
    seriesDates.forEach((date, i) => {
        dateToValue[date] = seriesData[i]
    })

    return allCategories.map(date => dateToValue[date] ?? 0)
}

function normalizeSeriesData(
    baseDates: string[],
    sourceDates: string[],
    sourceData: number[]
): number[] {
    const valueMap = sourceDates.reduce<Record<string, number>>((acc, date, i) => {
        acc[date] = sourceData[i]
        return acc
    }, {})

    return baseDates.map(date => valueMap[date] ?? 0)
}


function padStripeSeriesToMatchCategories(
    allCategories: string[],
    stripeDates: string[],
    stripeValues: number[]
): number[] {
    const stripeMap = stripeDates.reduce<Record<string, number>>((acc, date, i) => {
        acc[date] = stripeValues[i]
        return acc
    }, {})

    return allCategories.map(date => stripeMap[date] ?? 0)
}

function alignStripeToEtsyDates(
    etsyCategories: string[],
    stripeData: { amount: number; date: Date }[]
): number[] {
    const stripeMap = stripeData.reduce<Record<string, number>>((acc, d) => {
        const dateStr = d.date.toLocaleDateString()
        acc[dateStr] = d.amount
        return acc
    }, {})

    return etsyCategories.map(date => stripeMap[date] ?? 0)
}


export async function apiGetRevenueDashboardData<T extends RevenueDashboardData, U extends DashboardQuery>(params: U) {
    const { startDate, endDate } = params

    const duration = endDate - startDate
    const prevStart = startDate - duration
    const prevEnd = endDate - duration

    const fetchDeposits = async (collectionName: string, start: number, end: number) => {
        const ref = collection(db, collectionName)

        const dateField = collectionName === 'stripe_deposits' ? 'arrivalDate' : 'date'

        const querySnap = query(
            ref,
            where(dateField, '>=', new Date(start * 1000).toISOString()),
            where(dateField, '<=', new Date(end * 1000).toISOString())
        )

        const snapshot = await getDocs(querySnap)

        return snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                amount: parseFloat(data.amount),
                date: new Date(data[dateField]),
            }
        })
    }

    const [etsyCurrent, etsyPrevious, stripeCurrent, stripePrevious] = await Promise.all([
        fetchDeposits('etsy_deposits', startDate, endDate),
        fetchDeposits('etsy_deposits', prevStart, prevEnd),
        fetchDeposits('stripe_deposits', startDate, endDate),
        fetchDeposits('stripe_deposits', prevStart, prevEnd),
    ])

    const computeStats = (deposits: { amount: number; date: Date }[]) => {
        const total = deposits.reduce((sum, d) => sum + d.amount, 0)
        const days = Math.max(1, Math.ceil(duration / 86400))
        const weeks = Math.max(1, days / 7)
        return {
            totalRevenue: parseFloat(total.toFixed(2)),
            averageDailyRevenue: parseFloat((total / days).toFixed(2)),
            averageWeeklyRevenue: parseFloat((total / weeks).toFixed(2)),
        }
    }

    const etsyCategories = etsyCurrent.map(d => d.date.toLocaleDateString())
    const stripeValues = stripeCurrent.map(d => d.amount)
    const etsyDates = etsyCurrent.map(d => d.date.toLocaleDateString())
    const stripeDates = stripeCurrent.map(d => d.date.toLocaleDateString())
    const paddedStripeData = padStripeSeriesToMatchCategories(etsyCategories, stripeDates, stripeValues)

    const unifiedDates = Array.from(new Set([...etsyDates, ...stripeDates])).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    )

    const stripeAligned = alignSeriesToCategories(etsyCategories, stripeDates, stripeValues)
    const alignedStripeData = alignStripeToEtsyDates(etsyCategories, stripeCurrent)

    const data: RevenueDashboardData = {
        etsyStatisticData: computeStats(etsyCurrent),
        etsyRevenueData: {
            series: [
                { name: 'Etsy', data: etsyCurrent.map(d => d.amount) },
                //{ name: 'Previous Period', data: etsyPrevious.map(d => d.amount) },
            ],
            categories: etsyCurrent.map(d => d.date.toLocaleDateString()),
            colors: [COLOR_1],
        },
        stripeStatisticData: computeStats(stripeCurrent),
        stripeRevenueData: {
            series: [
                { name: 'Website', data: stripeCurrent.map(d => d.amount) },
                //{ name: 'Previous Period', data: stripePrevious.map(d => d.amount) },
            ],
            categories: stripeCurrent.map(d => d.date.toLocaleDateString()),
            colors: [COLOR_2],
        },
    }

    return { data } as { data: T }
}

