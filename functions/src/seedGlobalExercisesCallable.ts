import * as admin from "firebase-admin";
import { onCall, type CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { upsertGlobalExercises } from "./globalExercisesSeeder";
import type {
    GlobalExerciseSeedCategory,
    GlobalExerciseSeedItem,
} from "./data/globalExercisesSeedData";

const DEFAULT_PROJECT_ID = "personal-sport-tracker";

type SeedGlobalExercisesResponse = {
    upserted: number;
};

type SeedGlobalExercisesRequest = {
    seedData?: GlobalExerciseSeedCategory[];
};

const isString = (value: unknown): value is string => {
    return typeof value === "string" && value.trim().length > 0;
};

const isValidExerciseItem = (value: unknown): value is GlobalExerciseSeedItem => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const item = value as Record<string, unknown>;
    return (
        isString(item.name) &&
        isString(item.name_en) &&
        isString(item.muscleGroup) &&
        isString(item.equipment)
    );
};

const isValidCategory = (value: unknown): value is GlobalExerciseSeedCategory => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const category = value as Record<string, unknown>;
    return (
        isString(category.category) &&
        Array.isArray(category.exercises) &&
        category.exercises.length > 0 &&
        category.exercises.every(isValidExerciseItem)
    );
};

export const seedGlobalExercisesCallable = onCall(
    async (
        request: CallableRequest<SeedGlobalExercisesRequest>,
    ): Promise<SeedGlobalExercisesResponse> => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "You must be signed in to run this action.");
        }

        if (admin.apps.length === 0) {
            admin.initializeApp({ projectId: DEFAULT_PROJECT_ID });
        }

        const rawSeedData = request.data?.seedData;
        if (rawSeedData && (!Array.isArray(rawSeedData) || !rawSeedData.every(isValidCategory))) {
            throw new HttpsError("invalid-argument", "Invalid seed payload.");
        }

        const db = admin.firestore();
        const upserted = await upsertGlobalExercises(db, rawSeedData);

        return { upserted };
    },
);
