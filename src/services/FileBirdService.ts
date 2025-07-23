// services/FileBirdService.ts

import axios from 'axios'

const WP_API_URL = import.meta.env.VITE_WORDPRESS_API_URL!
const FILEBIRD_TOKEN = import.meta.env.VITE_FILEBIRD_TOKEN!

// Base path for all public FileBird v1 endpoints
const FB_BASE = `${WP_API_URL}/filebird/public/v1`

interface Folder {
    id: number
    text: string
    parent: number
}

/**
 * Create a new FileBird folder.
 * @param name         The folder name (e.g. your SKU).
 * @param parent_id    The folder ID under which to nest (0 to create at root).
 * @returns The newly-created folder object.
 */
export async function createFileBirdFolder(
    name: string,
    parent_id: number = 0
): Promise<Folder> {
    const url = `${FB_BASE}/folders`

    // FileBird expects JSON { name: string, parent_id: number }
    const res = await axios.post(url,
        { name, parent_id },
        {
            headers: {
                'Authorization': `Bearer ${FILEBIRD_TOKEN}`,
                'Content-Type': 'application/json',
            }
        }
    )

    // docs say 200 returns { success: true, data: { id: 40 } }
    if (!res.data.success) {
        throw new Error('FileBird create folder failed')
    }

    // if you need the full Folder object you can then GET /folders/:id
    // but at minimum we have the new id:
    return { id: res.data.data.id, text: name, parent: parent_id }
}

/**
 * Assign one or more attachment IDs to a FileBird folder.
 * @param folderId       The FileBird folder ID.
 * @param attachmentIds  Array of WP media IDs to move into that folder.
 */
export async function assignMediaToFileBirdFolder(
    folderId: number,
    attachmentIds: number[]
): Promise<void> {
    // docs say POST to /folder/set-attachment
    const url = `${FB_BASE}/folder/set-attachment`
    const res = await axios.post(
        url,
        { folder: folderId, ids: attachmentIds },
        {
            headers: {
                'Authorization': `Bearer ${FILEBIRD_TOKEN}`,
                'Content-Type': 'application/json',
            }
        }
    )

    if (!res.data.success) {
        throw new Error('FileBird assign attachments failed')
    }
}
