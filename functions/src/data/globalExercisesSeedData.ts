export type GlobalExerciseCategory = string;

export interface GlobalExerciseSeedItem {
    name: string;
    name_en: string;
    muscleGroup: string;
    equipment: string;
}

export interface GlobalExerciseSeedCategory {
    category: GlobalExerciseCategory;
    exercises: GlobalExerciseSeedItem[];
}

export type GlobalExercisesSeedData = GlobalExerciseSeedCategory[];

export const globalExercisesSeedData: GlobalExercisesSeedData = [
    {
        category: "push",
        exercises: [
            {name: "Pompes", name_en: "Push-Up", muscleGroup: "pectoraux", equipment: "poids_du_corps"},
            {name: "Pompes inclinées", name_en: "Incline Push-Up", muscleGroup: "pectoraux", equipment: "poids_du_corps"},
            {name: "Pompes déclinées", name_en: "Decline Push-Up", muscleGroup: "pectoraux", equipment: "poids_du_corps"},
            {name: "Pompes diamant", name_en: "Diamond Push-Up", muscleGroup: "triceps", equipment: "poids_du_corps"},
            {name: "Pompes archer", name_en: "Archer Push-Up", muscleGroup: "pectoraux", equipment: "poids_du_corps"},
            {
                name: "Pompes pseudo planche",
                name_en: "Pseudo Planche Push-Up",
                muscleGroup: "épaules",
                equipment: "poids_du_corps",
            },
            {name: "Pompes explosives", name_en: "Clap Push-Up", muscleGroup: "pectoraux", equipment: "poids_du_corps"},
            {name: "Pompes pike", name_en: "Pike Push-Up", muscleGroup: "épaules", equipment: "poids_du_corps"},
            {
                name: "Pompes en équilibre (HSPU)",
                name_en: "Handstand Push-Up",
                muscleGroup: "épaules",
                equipment: "poids_du_corps",
            },
        ],
    },
    {
        category: "pull",
        exercises: [
            {name: "Tractions pronation", name_en: "Pull-Up", muscleGroup: "dos", equipment: "barre"},
            {name: "Tractions supination", name_en: "Chin-Up", muscleGroup: "biceps", equipment: "barre"},
            {name: "Tractions prise neutre", name_en: "Neutral Grip Pull-Up", muscleGroup: "dos", equipment: "barre"},
            {name: "Row inversé", name_en: "Australian Pull-Up", muscleGroup: "dos", equipment: "poids_du_corps"},
            {name: "Row aux anneaux", name_en: "Ring Row", muscleGroup: "dos", equipment: "anneaux"},
            {name: "Tractions archer", name_en: "Archer Pull-Up", muscleGroup: "dos", equipment: "barre"},
            {name: "Tractions typewriter", name_en: "Typewriter Pull-Up", muscleGroup: "dos", equipment: "barre"},
            {name: "Tractions L-sit", name_en: "L-Sit Pull-Up", muscleGroup: "abdominaux", equipment: "barre"},
        ],
    },
    {
        category: "legs",
        exercises: [
            {
                name: "Squat poids du corps",
                name_en: "Bodyweight Squat",
                muscleGroup: "jambes",
                equipment: "poids_du_corps",
            },
            {name: "Squat sauté", name_en: "Jump Squat", muscleGroup: "jambes", equipment: "poids_du_corps"},
            {
                name: "Fente bulgare",
                name_en: "Bulgarian Split Squat",
                muscleGroup: "jambes",
                equipment: "poids_du_corps",
            },
            {name: "Fentes", name_en: "Lunge", muscleGroup: "jambes", equipment: "poids_du_corps"},
            {name: "Fentes arrière", name_en: "Reverse Lunge", muscleGroup: "jambes", equipment: "poids_du_corps"},
            {
                name: "Fentes marchées",
                name_en: "Walking Lunge",
                muscleGroup: "jambes",
                equipment: "poids_du_corps",
            },
            {name: "Montée sur banc", name_en: "Step-Up", muscleGroup: "jambes", equipment: "poids_du_corps"},
            {name: "Pistol squat", name_en: "Pistol Squat", muscleGroup: "jambes", equipment: "poids_du_corps"},
            {name: "Mollets debout", name_en: "Calf Raise", muscleGroup: "mollets", equipment: "poids_du_corps"},
            {name: "Pont fessier", name_en: "Glute Bridge", muscleGroup: "fessiers", equipment: "poids_du_corps"},
        ],
    },
    {
        category: "core",
        exercises: [
            {name: "Gainage", name_en: "Plank", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
            {name: "Gainage latéral", name_en: "Side Plank", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
            {
                name: "Hollow body hold",
                name_en: "Hollow Body Hold",
                muscleGroup: "abdominaux",
                equipment: "poids_du_corps",
            },
            {name: "Sit-up", name_en: "Sit-Up", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
            {name: "Crunch", name_en: "Crunch", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
            {name: "Relevé de jambes", name_en: "Leg Raise", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
            {
                name: "Relevé de jambes suspendu",
                name_en: "Hanging Leg Raise",
                muscleGroup: "abdominaux",
                equipment: "barre",
            },
            {name: "Russian twist", name_en: "Russian Twist", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
            {
                name: "Mountain climber",
                name_en: "Mountain Climber",
                muscleGroup: "abdominaux",
                equipment: "poids_du_corps",
            },
            {name: "V-up", name_en: "V-Up", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
        ],
    },
    {
        category: "full_body",
        exercises: [
            {name: "Burpee", name_en: "Burpee", muscleGroup: "full_body", equipment: "poids_du_corps"},
            {name: "Jumping jack", name_en: "Jumping Jack", muscleGroup: "full_body", equipment: "poids_du_corps"},
            {
                name: "Montées de genoux",
                name_en: "High Knees",
                muscleGroup: "full_body",
                equipment: "poids_du_corps",
            },
            {name: "Bear crawl", name_en: "Bear Crawl", muscleGroup: "full_body", equipment: "poids_du_corps"},
            {name: "Crab walk", name_en: "Crab Walk", muscleGroup: "full_body", equipment: "poids_du_corps"},
        ],
    },
    {
        category: "static_skills",
        exercises: [
            {name: "Dead hang", name_en: "Dead Hang", muscleGroup: "grip", equipment: "barre"},
            {name: "L-sit", name_en: "L-Sit", muscleGroup: "abdominaux", equipment: "poids_du_corps"},
            {
                name: "Handstand contre mur",
                name_en: "Wall Handstand Hold",
                muscleGroup: "épaules",
                equipment: "poids_du_corps",
            },
            {name: "Front lever", name_en: "Front Lever", muscleGroup: "dos", equipment: "barre"},
            {name: "Back lever", name_en: "Back Lever", muscleGroup: "dos", equipment: "barre"},
            {name: "Planche", name_en: "Planche", muscleGroup: "épaules", equipment: "poids_du_corps"},
            {name: "Drapeau humain", name_en: "Human Flag", muscleGroup: "abdominaux", equipment: "barre"},
        ],
    },
    {
        category: "machines_chest",
        exercises: [
            {
                name: "Presse à pectoraux (machine)",
                name_en: "Chest Press Machine",
                muscleGroup: "pectoraux",
                equipment: "machine",
            },
            {
                name: "Pec deck (écarté machine)",
                name_en: "Pec Deck Fly",
                muscleGroup: "pectoraux",
                equipment: "machine",
            },
            {
                name: "Chest press incliné (machine)",
                name_en: "Incline Chest Press Machine",
                muscleGroup: "pectoraux",
                equipment: "machine",
            },
            {
                name: "Chest press convergent",
                name_en: "Converging Chest Press Machine",
                muscleGroup: "pectoraux",
                equipment: "machine",
            },
        ],
    },
    {
        category: "machines_back",
        exercises: [
            {
                name: "Tirage vertical (lat pulldown)",
                name_en: "Lat Pulldown",
                muscleGroup: "dos",
                equipment: "machine",
            },
            {
                name: "Tirage horizontal (seated row)",
                name_en: "Seated Row Machine",
                muscleGroup: "dos",
                equipment: "machine",
            },
            {
                name: "Tirage poitrine guidé",
                name_en: "Assisted Pull-Up Machine",
                muscleGroup: "dos",
                equipment: "machine",
            },
            {
                name: "Row machine convergente",
                name_en: "Converging Row Machine",
                muscleGroup: "dos",
                equipment: "machine",
            },
            {
                name: "Tirage unilatéral machine",
                name_en: "Single Arm Row Machine",
                muscleGroup: "dos",
                equipment: "machine",
            },
        ],
    },
    {
        category: "machines_shoulders",
        exercises: [
            {
                name: "Développé épaules (machine)",
                name_en: "Shoulder Press Machine",
                muscleGroup: "épaules",
                equipment: "machine",
            },
            {
                name: "Élévations latérales (machine)",
                name_en: "Lateral Raise Machine",
                muscleGroup: "épaules",
                equipment: "machine",
            },
            {
                name: "Élévations arrière (machine)",
                name_en: "Rear Delt Machine",
                muscleGroup: "épaules",
                equipment: "machine",
            },
        ],
    },
    {
        category: "machines_legs",
        exercises: [
            {name: "Presse à cuisses", name_en: "Leg Press", muscleGroup: "jambes", equipment: "machine"},
            {
                name: "Extension des jambes",
                name_en: "Leg Extension",
                muscleGroup: "quadriceps",
                equipment: "machine",
            },
            {
                name: "Leg curl allongé",
                name_en: "Lying Leg Curl",
                muscleGroup: "ischios",
                equipment: "machine",
            },
            {
                name: "Leg curl assis",
                name_en: "Seated Leg Curl",
                muscleGroup: "ischios",
                equipment: "machine",
            },
            {
                name: "Hack squat (machine)",
                name_en: "Hack Squat Machine",
                muscleGroup: "jambes",
                equipment: "machine",
            },
            {
                name: "Smith machine squat",
                name_en: "Smith Machine Squat",
                muscleGroup: "jambes",
                equipment: "machine",
            },
            {
                name: "Mollets à la presse",
                name_en: "Leg Press Calf Raise",
                muscleGroup: "mollets",
                equipment: "machine",
            },
            {
                name: "Mollets debout machine",
                name_en: "Standing Calf Raise Machine",
                muscleGroup: "mollets",
                equipment: "machine",
            },
        ],
    },
    {
        category: "machines_glutes",
        exercises: [
            {
                name: "Hip thrust machine",
                name_en: "Hip Thrust Machine",
                muscleGroup: "fessiers",
                equipment: "machine",
            },
            {
                name: "Kickback fessiers (machine)",
                name_en: "Glute Kickback Machine",
                muscleGroup: "fessiers",
                equipment: "machine",
            },
            {
                name: "Abducteurs (machine)",
                name_en: "Hip Abduction Machine",
                muscleGroup: "fessiers",
                equipment: "machine",
            },
            {
                name: "Adducteurs (machine)",
                name_en: "Hip Adduction Machine",
                muscleGroup: "adducteurs",
                equipment: "machine",
            },
        ],
    },
    {
        category: "machines_arms",
        exercises: [
            {
                name: "Curl biceps (machine)",
                name_en: "Biceps Curl Machine",
                muscleGroup: "biceps",
                equipment: "machine",
            },
            {
                name: "Curl pupitre (machine)",
                name_en: "Preacher Curl Machine",
                muscleGroup: "biceps",
                equipment: "machine",
            },
            {
                name: "Extension triceps (machine)",
                name_en: "Triceps Extension Machine",
                muscleGroup: "triceps",
                equipment: "machine",
            },
            {
                name: "Dips assistés (machine)",
                name_en: "Assisted Dip Machine",
                muscleGroup: "triceps",
                equipment: "machine",
            },
        ],
    },
    {
        category: "machines_core",
        exercises: [
            {
                name: "Crunch (machine)",
                name_en: "Ab Crunch Machine",
                muscleGroup: "abdominaux",
                equipment: "machine",
            },
            {
                name: "Relevé de jambes (machine)",
                name_en: "Vertical Knee Raise Machine",
                muscleGroup: "abdominaux",
                equipment: "machine",
            },
            {
                name: "Rotation du buste (machine)",
                name_en: "Torso Rotation Machine",
                muscleGroup: "abdominaux",
                equipment: "machine",
            },
        ],
    },
    {
        category: "machines_cardio",
        exercises: [
            {
                name: "Tapis de course",
                name_en: "Treadmill",
                muscleGroup: "cardio",
                equipment: "machine",
            },
            {
                name: "Vélo",
                name_en: "Stationary Bike",
                muscleGroup: "cardio",
                equipment: "machine",
            },
            {
                name: "Vélo elliptique",
                name_en: "Elliptical Trainer",
                muscleGroup: "cardio",
                equipment: "machine",
            },
            {
                name: "Rameur",
                name_en: "Rowing Machine",
                muscleGroup: "full_body",
                equipment: "machine",
            },
            {
                name: "Stairmaster",
                name_en: "Stair Climber",
                muscleGroup: "cardio",
                equipment: "machine",
            },
        ],
    },
];
