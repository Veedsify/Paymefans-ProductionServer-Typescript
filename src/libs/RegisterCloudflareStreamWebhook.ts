const { CLOUDFLARE_WEBHOOK_URL, CLOUDFLARE_ACCOUNT_TOKEN } = process.env
const TEST_WEBHOOK_URL = `https://247b-197-211-59-109.ngrok-free.app`

export function RegisterCloudflareStreamWebhook(): void {
    try {
        async function register(): Promise<void> {
            const data = {
                notificationUrl: `${TEST_WEBHOOK_URL}/api/webhooks/cloudflare/processed-post-media`,
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
            const response = await res.json()
            console.log("Webhook registered", response)
        }

        register()
    } catch (error) {
        console.error("Failed to register webhook", error)
    }
}
