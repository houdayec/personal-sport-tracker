export class SearchQuery {
    id: string
    query: string
    createdAt: number
    updatedAt: number
    currentRanks: number[] = []
    history: SearchResult[] = []

    constructor(id: string, query: string) {
        this.id = id
        this.query = query
        const now = Date.now()
        this.createdAt = now
        this.updatedAt = now
    }

    addSnapshot(snapshot: SearchResult) {
        this.history.push(snapshot)
        this.updatedAt = Date.now()

        // If it's the latest snapshot (first one being added), extract all FontMaze positions
        if (this.history.length === 1) {
            const ranks = snapshot.listings
                .filter(l => l.brand === "FontMaze")
                .map(l => l.position)
                .filter((p): p is number => p !== null && p !== undefined)

            // If no ranks found, store 'none', otherwise store ranks
            this.currentRanks = ranks.length > 0 ? ranks : [-1]
        }
    }
}

export class SearchResult {
    id: string // timestamp string or UUID
    date: number
    listings: RankedListing[] = []
    sourceFile?: string

    constructor(listings: RankedListing[]) {
        this.id = new Date().toISOString()
        this.date = Date.now()
        this.listings = listings
    }

    // Get the position of the "FontMaze" brand in the rankings
    get fontStationPosition(): number | null {
        const fontStationListing = this.listings.find(listing => listing.brand === "FontMaze");
        return fontStationListing ? fontStationListing.position : null;
    }
}

export class RankedListing {
    position!: number
    title!: string
    url!: string
    price!: number
    currency!: string
    etsyId!: string
    thumbnail!: string
    brand?: string

    constructor(data: Partial<RankedListing>) {
        Object.assign(this, data)
    }
}