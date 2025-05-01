import { redis } from "@libs/RedisStore"
import query from "@utils/prisma"
import express from "express"
import { Request, Response } from "express"
const pages = express.Router()
pages.get("/:page", async (req: Request, res: Response): Promise<any> => {
    try {
        const page = req.params.page
        if (!page || page.length < 1) {
            return res.status(400).json({ error: true, message: "Page not found" })
        }
        // Check Redis Cahce
        const cacheKey = `page:${page}`
        const cachedPage = await redis.get(cacheKey)
        if (cachedPage) {
            return res.status(200).json({
                error: false,
                ...JSON.parse(cachedPage),
                title: JSON.parse(cachedPage).title,
                content: JSON.parse(cachedPage).content,
                slug: JSON.parse(cachedPage).slug,
            })
        }
        const pageData = await query.outerPages.findFirst({
            where: {
                slug: page
            }
        })
        if (!pageData) {
            return res.status(404).json({ error: true, message: "Page not found" })
        }
        // Set Redis Cache
        await redis.set(cacheKey, JSON.stringify(pageData),
            "EX", 60 // 1 minute
        )
        return res.status(200).json({
            error: false,
            ...pageData,
            title: pageData.title,
            content: pageData.content,
            slug: pageData.slug,
        })
    } catch (error) {
        console.error("Error fetching page data:", error)
        return res.status(500).json({ error: true, message: "Internal server error" })
    }
})
export default pages