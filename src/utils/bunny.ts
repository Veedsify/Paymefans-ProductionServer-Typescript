const bunnyConfig = {
    storageZoneName: process.env.BUNNY_STORAGE_ZONE_NAME || '',
    cdnUrl: process.env.BUNNY_CDN_URL || '',
    pullZoneUrl: process.env.BUNNY_PULL_ZONE_URL || '',
    apiKey: process.env.BUNNY_API_KEY || '',
    videoLibraryId: process.env.BUNNY_VIDEO_LIBRARY_ID || '',
    feedCollectionId: process.env.BUNNY_FEED_COLLECTION_ID || ''
};


export {
    bunnyConfig
}