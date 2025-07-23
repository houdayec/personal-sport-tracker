// src/services/packageAndUpload.ts

import JSZip from 'jszip'
import axios from 'axios'
import {
    ref as storageRef,
    listAll,
    getDownloadURL,
    uploadBytes,
    type ListResult,
    type StorageReference,
} from 'firebase/storage'
import { storage } from '@/firebase'
import {
    createFileBirdFolder,
    assignMediaToFileBirdFolder,
} from './FileBirdService'

const WP_API = import.meta.env.VITE_WORDPRESS_API_URL
const WP_MEDIA_URL = `${WP_API}/wp/v2/media`
const WP_BASIC = btoa(
    `${import.meta.env.VITE_WP_USERNAME}:${import.meta.env.VITE_WP_APP_PASSWORD}`
)

/**
 * Recursively lists all file references under a given Firebase Storage reference.
 */
async function listAllFilesRecursively(ref: StorageReference): Promise<StorageReference[]> {
    console.log(`[listAllFilesRecursively] listing ${ref.fullPath}`)
    const res: ListResult = await listAll(ref)
    let items = [...res.items]
    for (const prefix of res.prefixes) {
        items = items.concat(await listAllFilesRecursively(prefix))
    }
    return items
}

/**
 * Creates (or finds) a FileBird folder named by SKU under the given parent,
 * then assigns the provided thumbnail IDs into it.
 */
export async function exportThumbnailsToFileBird(
    sku: string,
    thumbnailIds: number[],
    fbParentFolderId: number
): Promise<any> {
    console.log(`[exportThumbnailsToFileBird] creating folder for SKU=${sku}`)
    const folder = await createFileBirdFolder(sku, fbParentFolderId)
    console.log(`[exportThumbnailsToFileBird] assigning ${thumbnailIds.length} thumbnails to folder ${folder.id}`)
    await assignMediaToFileBirdFolder(folder.id, thumbnailIds)
    console.log(`[exportThumbnailsToFileBird] done`)
    return folder
}

/**
 * Generates a ZIP blob of everything under the given Firebase Storage path,
 * preserving subfolder structure, and names it `${sku}_${fontName}.zip`.
 */
export async function generateZipFromFirebase(
    firebaseFolderPath: string,
    sku: string,
    fontName: string
): Promise<{ zipBlob: Blob; zipFilename: string }> {
    const base = firebaseFolderPath.replace(/\/$/, '')
    console.log(`[generateZipFromFirebase] zipping folder ${base}`)
    const zip = new JSZip()
    const rootRef = storageRef(storage, base)
    const files = await listAllFilesRecursively(rootRef)

    console.log(`[generateZipFromFirebase] found ${files.length} files`)
    for (const f of files) {
        const relPath = f.fullPath.replace(base + '/', '')
        console.log(`[generateZipFromFirebase] adding ${relPath}`)
        const blob = await (await fetch(await getDownloadURL(f))).blob()
        zip.file(relPath, blob)
    }

    const buffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    })
    const zipBlob = new Blob([buffer], { type: 'application/zip' })
    const zipFilename = `${sku}_${fontName}.zip`
    console.log(
        `[generateZipFromFirebase] generated ${zipFilename} (${(zipBlob.size / 1024).toFixed(1)} KB)`
    )
    return { zipBlob, zipFilename }
}

/**
 * Uploads a ZIP blob to Firebase Storage under `/products/${sku}/`
 * and returns its download URL.
 */
export async function uploadZipToFirebase(
    zipBlob: Blob,
    sku: string,
    zipFilename: string
): Promise<string> {
    console.log(`[uploadZipToFirebase] uploading ${zipFilename}`)
    const path = `products/${sku}/${zipFilename}`
    const zipRef = storageRef(storage, path)
    await uploadBytes(zipRef, zipBlob)
    const url = await getDownloadURL(zipRef)
    console.log(`[uploadZipToFirebase] uploaded at ${url}`)
    return url
}

/**
 * Uploads a ZIP blob to WordPress media endpoint and returns
 * the new media object including its `id` and `source_url`.
 */
export async function uploadZipToWordPress(
    zipBlob: Blob,
    zipFilename: string
): Promise<{ id: number; source_url: string }> {
    console.log(`[uploadZipToWordPress] uploading ${zipFilename}`)
    const form = new FormData()
    form.append('file', zipBlob, zipFilename)
    form.append('meta[_rank_math_sitemap_exclude]', 'on')
    const res = await axios.post<{ id: number; source_url: string }>(
        WP_MEDIA_URL,
        form,
        {
            headers: {
                Authorization: `Basic ${WP_BASIC}`,
                'Content-Type': 'multipart/form-data',
            },
        }
    )
    console.log(`[uploadZipToWordPress] returned media ID ${res.data.id}`)
    return res.data
}

/**
 * Assigns a WordPress media item (e.g. the ZIP) into a FileBird folder.
 */
export async function assignZipToFileBird(
    fbFolderId: number,
    zipMediaId: number
): Promise<void> {
    console.log(`[assignZipToFileBird] assigning media ${zipMediaId} to folder ${fbFolderId}`)
    await assignMediaToFileBirdFolder(fbFolderId, [zipMediaId])
    console.log(`[assignZipToFileBird] done`)
}
