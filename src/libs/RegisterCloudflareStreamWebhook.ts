const { CLOUDFLARE_WEBHOOK_URL, CLOUDFLARE_ACCOUNT_TOKEN, CLOUDFLARE_WEBHOOK_CALLBACK } = process.env

export function RegisterCloudflareStreamWebhook(): void {
    try {
        async function register(): Promise<void> {
            return
            const data = {
                notificationUrl: `${CLOUDFLARE_WEBHOOK_CALLBACK}/api/webhooks/cloudflare/processed-post-media`,
            }
            const res = await fetch(CLOUDFLARE_WEBHOOK_URL as string, {
                method: "PUT",
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`
                },
            })

            if (!res.ok) {
                console.error("Failed to register webhook", res)
            }
            await res.json()
            console.log("Webhook registered")
        }

        register()
    } catch (error) {
        console.error("Failed to register webhook", error)
        throw new Error("Failed to register webhook")
    }
}
