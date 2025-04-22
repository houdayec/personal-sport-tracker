/* eslint-disable new-cap */
/* eslint-disable max-len */
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { firestore } from "firebase-admin";
import { defineSecret } from "firebase-functions/params";

const PROXY_URL = defineSecret("PROXY_URL");
const PROXY_USER = defineSecret("PROXY_USER");
const PROXY_PASSWORD = defineSecret("PROXY_PASSWORD");

import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

// Fetches Etsy search HTML for the first product
export const fetchEtsyProductsRankings = onRequest(
    {
        secrets: [PROXY_URL, PROXY_USER, PROXY_PASSWORD],
        timeoutSeconds: 300,
        memory: "1GiB",
    },
    async (req, res) => {
        try {
            const db = firestore();
            const snapshot = await db.collection("products").limit(1).get();

            if (snapshot.empty) {
                res.status(404).send("No products found.");
                return;
            }

            const product = snapshot.docs[0].data();
            const productName = product.name;
            const searchQuery = `${productName} embroidery font`;
            const etsySearchUrl = `https://www.etsy.com/search?q=${encodeURIComponent(searchQuery)}`;

            logger.log(`🔍 Searching Etsy for: ${searchQuery}`);

            const browser = await puppeteer.launch({
                executablePath: await chromium.executablePath,
                headless: chromium.headless,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    `--proxy-server=${PROXY_URL.value()}`,
                ],
            });

            const page = await browser.newPage();
            logger.log(`🌐 Using proxy: ${PROXY_URL.value()}`);

            await page.setViewport([
                { width: 1920, height: 1080 }, // Desktop
                { width: 1366, height: 768 }, // Laptop
                { width: 1536, height: 864 }, // Large laptop
                { width: 1280, height: 720 }, // Small laptop
                { width: 375, height: 812 }, // iPhone X
                { width: 414, height: 896 }, // iPhone XR
                { width: 390, height: 844 }, // iPhone 12
                { width: 360, height: 800 }, // Android phone
            ][Math.floor(Math.random() * 8)]);
            const userAgents = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
            ];

            // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
            await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);

            await page.authenticate({
                username: PROXY_USER.value(),
                password: PROXY_PASSWORD.value(),
            });
            // Simulate human-like behavior
            await page.goto(etsySearchUrl, { waitUntil: "networkidle2", timeout: 60000 });
            logger.log(`🌐 Navigated to: ${etsySearchUrl}`);
            await page.mouse.move(100, 100);
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 1000));
            await page.mouse.move(300, 200);
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 500));
            await page.evaluate(() => window.scrollBy(0, Math.floor(Math.random() * 500)));
            await new Promise((resolve) => setTimeout(resolve, 3000));

            const html = await page.content();
            await browser.close();

            logger.log(`✅ HTML captured for: ${productName}`);
            logger.log(`HTML content: ${html.substring(0, 1000)}...`); // Log first 100 characters
            res.status(200).send(html);
        } catch (error) {
            logger.error("❌ Failed to fetch HTML:", error);
            res.status(500).send("Error fetching HTML.");
        }
    }
);

export const fetchVarsityHtml = onRequest(async (_req, res) => {
    const etsySearchUrl = "https://www.etsy.com/search?q=varsity+embroidery+font";

    logger.log(`🔍 Fetching Etsy search page: ${etsySearchUrl}`);

    try {
        const response = await fetch(etsySearchUrl);
        if (!response.ok) {
            logger.error(`❌ Failed to fetch: ${response.status} ${response.statusText}`);
            res.status(500).send("Failed to fetch HTML from Etsy.");
            return;
        }

        const html = await response.text();
        logger.log("✅ Successfully fetched HTML content.");
        res.status(200).send(html);
    } catch (err) {
        logger.error("❌ Error during fetch:", err);
        res.status(500).send("Internal error while fetching HTML.");
    }
});
