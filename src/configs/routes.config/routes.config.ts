import { lazy } from "react";
import authRoute from "./authRoute";
import type { Routes } from "@/@types/routes";
import { ADMIN, USER } from "@/constants/roles.constant";

export const publicRoutes: Routes = [...authRoute];

export const protectedRoutes = [
    {
        key: "home",
        path: "/home",
        component: lazy(() => import("@/views/Home")),
        authority: ['USER'],
    },
    // Stats Section
    {
        key: "stats.revenue",
        path: "/stats/revenue",
        component: lazy(() => import("@/views/stats/Revenue")),
        authority: ['USER'],
    },
    // Website Section
    {
        key: "website.stats",
        path: "/website/stats",
        component: lazy(() => import("@/views/website/WebsiteStats")),
        authority: ['USER'],
    },
    {
        key: "website.orders",
        path: "/website/orders",
        component: lazy(() => import("@/views/website/OrderList/OrderList")),
        authority: ['USER'],
    },
    {
        key: "website.customers",
        path: "/website/customers",
        component: lazy(() => import("@/views/website/Customers/Customers")),
        authority: ['USER'],
    },
    {
        key: 'appsSales.orderDetails',
        path: `website/orders/order-details/:orderId`,
        component: lazy(() => import('@/views/website/OrderDetails')),
        authority: ['USER'],
    },
    {
        key: "website.reviews",
        path: "/website/reviews",
        component: lazy(() => import("@/views/website/ReviewGenerator")),
        authority: ['USER'],
    },
    // Etsy Section
    {
        key: "etsy.messages",
        path: "/etsy/messages",
        component: lazy(() => import("@/views/etsy/Messages")),
        authority: ['USER'],
    },
    {
        key: "etsy.stats",
        path: "/etsy/stats",
        component: lazy(() => import("@/views/etsy/EtsyStats")),
        authority: ['USER'],
    },
    {
        key: "etsy.reviews",
        path: "/etsy/reviews",
        component: lazy(() => import("@/views/etsy/Reviews")),
        authority: ['USER'],
    },
    {
        key: "etsy.rankings",
        path: "/etsy/rankings",
        component: lazy(() => import("@/views/etsy/Rankings")),
        authority: ['USER'],
    },
    {
        key: "etsy.followup",
        path: "/etsy/followup",
        component: lazy(() => import("@/views/etsy/FollowupReminder")),
        authority: ['USER'],
    },
    {
        key: "etsy.discounts",
        path: "/etsy/discounts",
        component: lazy(() => import("@/views/etsy/DiscountGenerator")),
        authority: ['USER'],
    },
    // Product Management
    {
        key: "products.manage",
        path: "/products",
        component: lazy(() => import("@/views/products/ProductList")),
        authority: ['USER'],
    },
    {
        key: "products.reviews",
        path: "/products/reviews",
        component: lazy(() => import("@/views/products/ReviewsManager")),
        authority: ['USER'],
    },
    {
        key: "products.manage",
        path: "/products/new",
        component: lazy(() => import("@/views/products/ProductNew")),
        authority: ['USER'],
    },
    {
        key: "products.manage",
        path: "/products/:id/edit",
        component: lazy(() => import("@/views/products/ProductEdit")),
        authority: ['USER'],
    },
    {
        key: 'products.manage',
        path: `/products/:id`,
        component: lazy(() => import('@/views/products/ProductView')),
        authority: ['USER'],
    },
    {
        key: "products.manage",
        path: `/products/:id/generate-thumbnail-metadata`,
        component: lazy(() => import("@/views/products/ProductEdit/components/ThumbnailMetadataGenerator")),
        authority: ['USER'],
    },
    {
        key: "products.manage",
        path: `/products/:id/generate-etsy-metadata`,
        component: lazy(() => import("@/views/products/ProductEdit/components/EtsyListingGeneratorHome")),
        authority: ['USER'],
    },
    {
        key: "products.manage",
        path: `/products/:id/generate-website-listing`,
        component: lazy(() => import("@/views/products/ProductEdit/components/WebsiteListingGeneratorHome")),
        authority: ['USER'],
    },
    // Tools
    {
        key: "tools.reviews",
        path: "/tools/reviews",
        component: lazy(() => import("@/views/website/ReviewGenerator")),
        authority: ['USER'],
    },
    {
        key: "tools.licenses",
        path: "/tools/licenses",
        component: lazy(() => import("@/views/tools/CommercialLicenseGenerator")),
        authority: ['USER'],
    },
    {
        key: "tools.metadatagenerator",
        path: "/tools/metadatagenerator",
        component: lazy(() => import("@/views/products/ProductEdit/components/ThumbnailMetadataGenerator")),
        authority: ['USER'],
    },
    {
        key: "tools.upload",
        path: "/tools/upload",
        component: lazy(() => import("@/views/tools/Uploader")),
        authority: ['USER'],
    },
    {
        key: "account.settings",
        path: "/account/settings/profile",
        component: lazy(() => import("@/views/account/Settings")),
        authority: ['USER'],
    }

];
