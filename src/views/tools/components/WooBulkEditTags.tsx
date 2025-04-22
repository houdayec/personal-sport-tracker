import Button from '@/components/ui/Button'
import { bulkTagProducts } from '@/services/CrmService'
import { useState } from 'react'

// This button triggers the tag update for all products using tag ID 1003
const WooBulkEditTags = () => {
    const [loading, setLoading] = useState(false)

    const handleClick = async () => {
        try {
            setLoading(true)
            console.log('🚀 Starting bulk tag update with tag ID 1003')
            await bulkTagProducts(1003)
            console.log('✅ Tag update completed')
        } catch (error) {
            console.error('❌ Error updating tags:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="solid"
            loading={loading}
            onClick={handleClick}
        >
            Update Tags
        </Button>
    )
}

export default WooBulkEditTags
