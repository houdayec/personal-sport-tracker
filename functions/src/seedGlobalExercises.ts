import * as admin from "firebase-admin";
import { upsertGlobalExercises } from "./globalExercisesSeeder";
const DEFAULT_PROJECT_ID = "personal-sport-tracker";

const seedGlobalExercises = async () => {
    const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT_ID ||
        DEFAULT_PROJECT_ID;

    if (admin.apps.length === 0) {
        admin.initializeApp({ projectId });
    }

    const db = admin.firestore();
    const total = await upsertGlobalExercises(db);

    console.log(`✅ Seed completed: ${total} global exercises upserted into 'global_exercises'.`);
};

seedGlobalExercises()
    .then(() => {
        process.exit(0);
    })
    .catch((error: unknown) => {
        console.error("❌ Failed to seed global exercises:", error);
        console.error(
            "ℹ️ Ensure Google credentials are configured (e.g. GOOGLE_APPLICATION_CREDENTIALS) " +
            "with access to project 'personal-sport-tracker'.",
        );
        process.exit(1);
    });
