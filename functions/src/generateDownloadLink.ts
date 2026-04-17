import * as admin from "firebase-admin";
import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { Dub } from "dub";
import { defineSecret } from "firebase-functions/params";

if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Define secrets
const DUB_API_KEY = defineSecret("DUB_API_KEY");
const DUB_API_KEY_FTS = defineSecret("DUB_API_KEY_FTS");

type RequestData = {
    sku: string
    fileName: string
};

export const generateDownloadLink = onCall(
    { secrets: [DUB_API_KEY, DUB_API_KEY_FTS] },
    async (request: CallableRequest<RequestData>) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "You must be signed in to use this function.");
        }

        const { sku, fileName } = request.data;
        if (!sku || !fileName) {
            throw new HttpsError("invalid-argument", "SKU and fileName are required.");
        }

        console.log("🔍 Generating download link for SKU:", sku);

        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({ prefix: `products/${sku}/` });

        const zipFile = files.find((file) => file.name.endsWith(".zip"));
        if (!zipFile) {
            throw new HttpsError("not-found", `No zip file found under SKU: ${sku}`);
        }

        console.log("📦 Found zip file:", zipFile.name);

        const expiresInMs = 7 * 24 * 60 * 60 * 1000;

        try {
            const [signedUrl] = await zipFile.getSignedUrl({
                action: "read",
                expires: Date.now() + expiresInMs,
            });

            const baseFileName = fileName.replace(/\.zip$/i, "");
            const randomLetters = [...Array(7)].map(() =>
                String.fromCharCode(Math.floor(Math.random() * 26) + (Math.random() > 0.5 ? 65 : 97))
            ).join("");
            const key = `${baseFileName.trim().replace(/\s+/g, "_")}_${randomLetters}`;
            console.log("🔑 Generated key:", key);
            // Primary DUB API
            try {
                const dubPrimary = new Dub({ token: DUB_API_KEY_FTS.value() });
                const { shortLink } = await dubPrimary.links.create({
                    url: signedUrl,
                    key,
                    domain: "link.font-station.com",
                });
                console.log("✅ Shortened with primary:", shortLink);
                return { url: shortLink };
            } catch (primaryError) {
                console.warn("⚠️ Primary Dub API failed. Falling back...", primaryError);
            }

            // Fallback DUB API
            try {
                const dubFallback = new Dub({ token: DUB_API_KEY.value() });
                const { shortLink } = await dubFallback.links.create({ url: signedUrl, key });
                console.log("✅ Shortened with fallback:", shortLink);
                return { url: shortLink };
            } catch (fallbackError) {
                console.error("❌ Fallback DUB API failed", fallbackError);
            }

            throw new Error("Both primary and fallback DUB APIs failed");
        } catch (error: unknown) {
            console.error("❌ Error generating signed URL");
            if (error instanceof Error) {
                console.error("Message:", error.message);
                console.error("Stack:", error.stack);
            }
            throw new HttpsError("internal", "Failed to generate signed URL");
        }
    }
);
