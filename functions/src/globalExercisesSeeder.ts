import * as admin from "firebase-admin";
import {
    globalExercisesSeedData,
    type GlobalExerciseSeedItem,
    type GlobalExercisesSeedData,
} from "./data/globalExercisesSeedData";

const GLOBAL_EXERCISES_COLLECTION = "global_exercises";
const EXERCISE_SCHEMA_VERSION = 1;

const slugify = (value: string): string => {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
};

const buildDocId = (
    category: string,
    exercise: GlobalExerciseSeedItem,
    usedIds: Set<string>,
): string => {
    const base = `${slugify(category)}__${slugify(exercise.name_en || exercise.name)}`;

    if (!usedIds.has(base)) {
        usedIds.add(base);
        return base;
    }

    let suffix = 2;
    while (usedIds.has(`${base}_${suffix}`)) {
        suffix += 1;
    }

    const finalId = `${base}_${suffix}`;
    usedIds.add(finalId);
    return finalId;
};

export const upsertGlobalExercises = async (
    db: admin.firestore.Firestore,
    seedData: GlobalExercisesSeedData = globalExercisesSeedData,
): Promise<number> => {
    const batch = db.batch();
    const usedIds = new Set<string>();
    const now = admin.firestore.FieldValue.serverTimestamp();

    let total = 0;

    for (const section of seedData) {
        for (const exercise of section.exercises) {
            const docId = buildDocId(section.category, exercise, usedIds);
            const ref = db.collection(GLOBAL_EXERCISES_COLLECTION).doc(docId);

            batch.set(
                ref,
                {
                    name: exercise.name,
                    name_en: exercise.name_en,
                    category: section.category,
                    muscleGroup: exercise.muscleGroup,
                    equipment: exercise.equipment,
                    isArchived: false,
                    schemaVersion: EXERCISE_SCHEMA_VERSION,
                    createdAt: now,
                    updatedAt: now,
                },
                { merge: true },
            );
            total += 1;
        }
    }

    await batch.commit();
    return total;
};
