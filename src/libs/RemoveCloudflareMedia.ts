const getUrl = (file) => {
      const { CLOUDFLARE_ACCOUNT_ID } = process.env;
      if (file.type.trim().includes('image')) {
            return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${file.id}`
      }
      if (file.type.trim().includes('video')) {
            return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${file.id}`
      }
}

const removeCloudflareMedia = async (media) => {
      try {
            const removeMediaPromises = media.map(async (file) => {
                  const url = getUrl(file)
                  const options = {
                        method: 'DELETE',
                        headers: {
                              "Authorization": `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`
                        }
                  }
                  const deleteMedia = await fetch(url, options)
                  if (!deleteMedia.ok) {
                        return {
                              error: true,
                              message: `Failed to delete ${file.id}`
                        }
                  }
                  await deleteMedia.json()
                  return {
                        error: false,
                        message: `Deleted ${file.id}`
                  }
            })
            const removedMedia = await Promise.all(removeMediaPromises)
            console.log(removedMedia)
            return removedMedia
      } catch (err) {
            console.log(err)
            return {
                  error: true,
                  message: 'Error deleting media'
            }
      }
}

export default removeCloudflareMedia;
