import { collection, getDocs, query, orderBy, limit, startAfter, Query, DocumentData, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { SearchQuery, SearchResult } from '@/shared/search_query';
import { TableQueries } from '@/@types/common';
import { SearchQueryFilterQueries } from '@/views/etsy/Rankings/store';

export async function apiGetSearchQueries<T, U extends TableQueries & { filterData?: SearchQueryFilterQueries }>(params: U) {
    try {
        const {
            pageIndex = 1,
            pageSize = 50,
            filterData = {},
        } = params;

        console.log("🚀 Fetching search queries with params:", params);

        const skipCount = (pageIndex - 1) * pageSize;
        const searchRef = collection(db, "search_queries");

        const filters: any[] = [];

        if (filterData?.currentRank !== undefined) {
            if (filterData.currentRank === 5) {
                filters.push(where("currentRanks", "array-contains", -1));
            } else {
                filters.push(where("currentRanks", "array-contains", filterData.currentRank));
                console.log("Added Firestore 'array-contains' filter for currentRanks:", filterData.currentRank);
            }
        }

        let baseQuery: Query<DocumentData> = query(
            searchRef,
            ...filters,
            orderBy("updatedAt", "desc"),
            limit(pageSize)
        );

        // Pagination
        if (pageIndex > 1 && skipCount > 0) {
            const skipQuery = query(
                searchRef,
                ...filters,
                orderBy("updatedAt", "desc"),
                limit(skipCount)
            );
            const skipSnap = await getDocs(skipQuery);
            const lastVisible = skipSnap.docs.at(-1);

            if (lastVisible) {
                baseQuery = query(
                    searchRef,
                    ...filters,
                    orderBy("updatedAt", "desc"),
                    startAfter(lastVisible),
                    limit(pageSize)
                );
            }
        }

        const snapshot = await getDocs(baseQuery);
        console.log("Fetched snapshot size:", snapshot.size);

        const queries: SearchQuery[] = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const base = docSnap.data() as SearchQuery;
                const queryInstance = new SearchQuery(base.id, base.query);
                queryInstance.createdAt = base.createdAt;
                queryInstance.updatedAt = base.updatedAt;

                // Load history
                const historyPagesRef = collection(db, 'search_queries', docSnap.id, 'historyPages');
                const historyPagesSnap = await getDocs(historyPagesRef);

                let history: SearchResult[] = [];
                for (const pageDoc of historyPagesSnap.docs) {
                    const pageData = pageDoc.data();
                    if (Array.isArray(pageData.snapshots)) {
                        history.push(...pageData.snapshots);
                    }
                }

                history.sort((a, b) => b.date - a.date);
                history.forEach(result => queryInstance.addSnapshot(result));

                return queryInstance;
            })
        );

        return {
            data: queries,
            total: 200,
        };
    } catch (error) {
        console.error("❌ Error fetching search queries:", error);
        throw new Error("Failed to fetch search queries.");
    }
}


export async function apiGetSearchQueries4<T, U extends TableQueries & { filterData?: SearchQueryFilterQueries }>(params: U) {
    try {
        const {
            pageIndex = 1,
            pageSize = 50,
            filterData = {},
        } = params;

        console.log("🚀 Fetching search queries with params:", params);

        const skipCount = (pageIndex - 1) * pageSize;
        const searchRef = collection(db, "search_queries");

        // Build filters based on currentRank and historyRank
        const filters: any[] = [];
        console.log("Initial filters:", filters);

        let baseQuery: Query<DocumentData> = query(
            searchRef,
            ...filters, // Apply rank filters here
            orderBy("updatedAt", "desc"),
            limit(pageSize)
        );

        console.log("Base query after filters:", baseQuery);

        // Pagination logic (only run if pageIndex > 1)
        if (pageIndex > 1 && skipCount > 0) {
            const skipQuery = query(
                searchRef,
                ...filters, // Apply the same filters to skipped query
                orderBy("updatedAt", "desc"),
                limit(skipCount)
            );
            const skipSnap = await getDocs(skipQuery);
            const lastVisible = skipSnap.docs.at(-1);

            if (lastVisible) {
                baseQuery = query(
                    searchRef,
                    ...filters, // Apply filters here
                    orderBy("updatedAt", "desc"),
                    startAfter(lastVisible),
                    limit(pageSize)
                );
                console.log("Base query after applying pagination:", baseQuery);
            }
        }

        const snapshot = await getDocs(baseQuery);
        console.log("Fetched snapshot:", snapshot);
        console.log("Snapshot size:", snapshot.size); // Log the number of documents fetched

        const queries: (SearchQuery | null)[] = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const base = docSnap.data() as SearchQuery;
                const queryInstance = new SearchQuery(base.id, base.query);
                queryInstance.createdAt = base.createdAt;
                queryInstance.updatedAt = base.updatedAt;

                console.log(`Processing query: ${base.query}, ID: ${base.id}`);

                // Fetch paginated history from 'historyPages' subcollection
                const historyPagesRef = collection(db, 'search_queries', docSnap.id, 'historyPages');
                const historyPagesSnap = await getDocs(historyPagesRef);
                console.log(`Fetched historyPages for query: ${base.query}, number of pages: ${historyPagesSnap.size}`);

                let history: SearchResult[] = [];

                // Loop through historyPages and extract snapshots
                for (const pageDoc of historyPagesSnap.docs) {
                    const pageData = pageDoc.data();
                    if (Array.isArray(pageData.snapshots)) {
                        history.push(...pageData.snapshots);
                        console.log(`Added ${pageData.snapshots.length} snapshots from page ${pageDoc.id}`);
                    }
                }

                // Sort history by date descending (latest snapshot comes first)
                history.sort((a, b) => b.date - a.date);
                console.log("Sorted history snapshots by date");

                // Add snapshots to the SearchQuery instance
                history.forEach((result) => {
                    queryInstance.addSnapshot(result);
                });

                console.log(`Added ${history.length} snapshots to query instance`);

                // Apply filter for historyRank in the history snapshots
                // if (filterData?.historyRank !== undefined && filterData.historyRank !== null) {
                //     console.log("Applying historyRank filter:", filterData.historyRank);
                //     history = history.filter(snapshot => {
                //         const position = snapshot.listings.find(l => l.brand === "FontMaze")?.position ?? null;
                //         if (position === null) {
                //             // If no position is found for FontMaze, treat as "Not Ranked"
                //             return filterData.historyRank === 5;
                //         }
                //         return filterData.historyRank === 5 ? position > 4 : position === filterData.historyRank;
                //     });
                //     console.log(`Filtered history snapshots based on historyRank: ${history.length} snapshots remain.`);
                // }

                // Apply the filter for currentRank based on position in the latest snapshot (history[0])
                // Apply the filter for currentRank based on position in the latest snapshot (history[0])
                if (filterData?.currentRank !== undefined && filterData.currentRank !== 5) {
                    console.log("Applying currentRank filter:", filterData.currentRank);

                    // Find the position of FontMaze in the first snapshot
                    const latestPosition = queryInstance.history[0]?.listings.find(l => l.brand === "FontMaze")?.position ?? null;

                    console.log(`Position query ${base.query}: ${latestPosition}`);

                    // If position is null (not ranked), skip this query
                    if (latestPosition === null) {
                        console.log(`Skipping query ${base.query} as it has no ranking`);
                        return null; // Skip queries with no ranking
                    }

                    // Now, apply the currentRank filter
                    if (latestPosition !== filterData.currentRank) {
                        console.log(`Skipping query ${base.query} as position ${latestPosition} does not match currentRank filter`);
                        return null; // Skip this query if the position doesn't match the filter
                    }
                }


                return queryInstance; // Return the queryInstance after applying the filters
            })
        );

        // Filter out null queries that do not match the filters
        const validQueries = queries.filter(query => query !== null) as SearchQuery[];

        console.log(`Returning ${validQueries.length} valid queries`);


        return {
            data: validQueries, // Return only valid queries
            total: snapshot.size, // Set total as the number of documents retrieved
        };
    } catch (error) {
        console.error("❌ Error fetching search queries:", error);
        throw new Error("Failed to fetch search queries.");
    }
}

export async function apiGetSearchQueries3<T, U extends TableQueries & { filterData?: SearchQueryFilterQueries }>(params: U) {
    try {
        const {
            pageIndex = 1,
            pageSize = 50,
            filterData = {},
        } = params;

        console.log("🚀 Fetching search queries with params:", params);

        const skipCount = (pageIndex - 1) * pageSize;
        const searchRef = collection(db, "search_queries");

        // Build filters based on currentRank and historyRank
        const filters: any[] = [];
        console.log("Initial filters:", filters);

        // Filter for currentRank in the search_queries collection
        if (filterData.currentRank !== undefined && filterData.currentRank !== 5) {
            filters.push(where("currentRank", "==", filterData.currentRank));
            console.log("Added currentRank filter:", filterData.currentRank);
        }

        // Query for search queries based on currentRank filter
        let baseQuery: Query<DocumentData> = query(
            searchRef,
            ...filters, // Apply rank filters here
            orderBy("updatedAt", "desc"),
            limit(pageSize)
        );

        console.log("Base query after filters:", baseQuery);

        // Pagination logic (only run if pageIndex > 1)
        if (pageIndex > 1 && skipCount > 0) {
            const skipQuery = query(
                searchRef,
                ...filters, // Apply the same filters to skipped query
                orderBy("updatedAt", "desc"),
                limit(skipCount)
            );
            const skipSnap = await getDocs(skipQuery);
            const lastVisible = skipSnap.docs.at(-1);

            if (lastVisible) {
                baseQuery = query(
                    searchRef,
                    ...filters, // Apply filters here
                    orderBy("updatedAt", "desc"),
                    startAfter(lastVisible),
                    limit(pageSize)
                );
                console.log("Base query after applying pagination:", baseQuery);
            }
        }

        const snapshot = await getDocs(baseQuery);
        console.log("Fetched snapshot:", snapshot);

        const queries: SearchQuery[] = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const base = docSnap.data() as SearchQuery;
                const queryInstance = new SearchQuery(base.id, base.query);
                queryInstance.createdAt = base.createdAt;
                queryInstance.updatedAt = base.updatedAt;

                console.log(`Processing query: ${base.query}, ID: ${base.id}`);

                // Fetch paginated history from 'historyPages' subcollection
                const historyPagesRef = collection(db, 'search_queries', docSnap.id, 'historyPages');
                const historyPagesSnap = await getDocs(historyPagesRef);
                console.log(`Fetched historyPages for query: ${base.query}, number of pages: ${historyPagesSnap.size}`);

                let history: SearchResult[] = [];

                // Loop through historyPages and extract snapshots
                for (const pageDoc of historyPagesSnap.docs) {
                    const pageData = pageDoc.data();
                    if (Array.isArray(pageData.snapshots)) {
                        history.push(...pageData.snapshots);
                        console.log(`Added ${pageData.snapshots.length} snapshots from page ${pageDoc.id}`);
                    }
                }

                // Sort history by date descending
                history.sort((a, b) => b.date - a.date);
                console.log("Sorted history snapshots by date");

                // ✅ Apply filter based on historyRank if provided
                if (filterData?.historyRank !== undefined && filterData.historyRank !== null) {
                    console.log("Applying historyRank filter:", filterData.historyRank);
                    history = history.filter(snapshot => {
                        const position = snapshot.listings.find(l => l.brand === "FontMaze")?.position ?? null;
                        if (position === null) return filterData.historyRank === 5;
                        return filterData.historyRank === 5 ? position > 4 : position === filterData.historyRank;
                    });
                    console.log(`Filtered history snapshots based on historyRank: ${history.length} snapshots remain.`);
                }

                // ✅ Apply filter based on currentRank if provided
                if (filterData?.currentRank !== undefined && filterData.currentRank !== 5) {
                    console.log("Applying currentRank filter:", filterData.currentRank);
                    const position = queryInstance.history[0]?.listings.find(l => l.brand === "FontMaze")?.position ?? null;
                    if (position !== null && position !== filterData.currentRank) {
                        console.log(`Skipping query ${base.query} as position ${position} does not match currentRank filter`);
                        return null; // Skip this query if it does not match the currentRank filter
                    }
                }

                // Add snapshots to the SearchQuery instance
                history.forEach((result) => {
                    queryInstance.addSnapshot(result);
                });

                console.log(`Added ${history.length} snapshots to query instance`);

                return queryInstance;
            })
        );

        console.log("Fetched queries:", queries);

        return {
            data: queries.filter(query => query !== null), // Remove null queries if they do not match the filter
            total: snapshot.size, // Set total as the number of documents retrieved
        };
    } catch (error) {
        console.error("❌ Error fetching search queries:", error);
        throw new Error("Failed to fetch search queries.");
    }
}

export async function apiGetSearchQueries2<T, U extends TableQueries & { filterData?: SearchQueryFilterQueries }>(params: U) {
    try {
        const {
            pageIndex = 1,
            pageSize = 50,
            filterData = {},
        } = params;

        console.log("🚀 Fetching search queries with params:", params);

        const skipCount = (pageIndex - 1) * pageSize;
        const searchRef = collection(db, "search_queries");

        // Build filters based on currentRank and historyRank
        const filters: any[] = [];

        if (filterData.currentRank !== undefined && filterData.currentRank !== 5) {
            filters.push(where("currentRank", "==", filterData.currentRank));
        }

        if (filterData.historyRank !== undefined && filterData.historyRank !== 5) {
            filters.push(where("historyRank", "==", filterData.historyRank));
        }

        let baseQuery: Query<DocumentData> = query(
            searchRef,
            ...filters, // Apply any rank filters here
            orderBy("updatedAt", "desc"),
            limit(pageSize)
        );

        if (pageIndex > 1 && skipCount > 0) {
            const skipQuery = query(
                searchRef,
                ...filters, // Apply the same filters to the skipped query
                orderBy("updatedAt", "desc"),
                limit(skipCount)
            );
            const skipSnap = await getDocs(skipQuery);
            const lastVisible = skipSnap.docs.at(-1);

            if (lastVisible) {
                baseQuery = query(
                    searchRef,
                    ...filters, // Apply filters here as well
                    orderBy("updatedAt", "desc"),
                    startAfter(lastVisible),
                    limit(pageSize)
                );
            }
        }

        const snapshot = await getDocs(baseQuery);

        const queries: SearchQuery[] = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
                const base = docSnap.data() as SearchQuery;
                const queryInstance = new SearchQuery(base.id, base.query);
                queryInstance.createdAt = base.createdAt;
                queryInstance.updatedAt = base.updatedAt;

                // Fetch paginated history from 'historyPages' subcollection
                const historyPagesRef = collection(db, 'search_queries', docSnap.id, 'historyPages');
                const historyPagesSnap = await getDocs(historyPagesRef);

                let history: SearchResult[] = [];

                for (const pageDoc of historyPagesSnap.docs) {
                    const pageData = pageDoc.data();
                    if (Array.isArray(pageData.snapshots)) {
                        history.push(...pageData.snapshots);
                    }
                }

                // Sort history by date descending
                history.sort((a, b) => b.date - a.date);

                // ✅ Apply filter based on historyRank if provided
                if (filterData?.historyRank !== undefined && filterData.historyRank !== null) {
                    history = history.filter(snapshot => {
                        const position = snapshot.listings.find(l => l.brand === "FontMaze")?.position ?? null;
                        if (position === null) return filterData.historyRank === 5;
                        return filterData.historyRank === 5 ? position > 4 : position === filterData.historyRank;
                    });
                }

                // Add snapshots to the SearchQuery instance
                history.forEach((result) => {
                    queryInstance.addSnapshot(result);
                });

                return queryInstance;
            })
        );

        return {
            data: queries,
            total: 200, // Arbitrary total since we skip count querying
        };
    } catch (error) {
        console.error("❌ Error fetching search queries:", error);
        throw new Error("Failed to fetch search queries.");
    }
}
