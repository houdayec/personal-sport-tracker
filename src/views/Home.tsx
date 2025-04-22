import { useMemo } from "react"
import UploadEtsyOrderItems from "./tools/components/EtsyOrderItemsUploader"
import UploadEtsyOrders from "./tools/components/UploadEtsyOrders"
import UploadEtsyReviews from "./tools/components/UploadEtsyReviews"
import { Tooltip } from "@/components/ui"

const greetings = [
    { text: "Welcome", emoji: "😊", language: "English" },
    { text: "Bonjour", emoji: "🇫🇷", language: "French" },
    { text: "Hola", emoji: "🇪🇸", language: "Spanish" },
    { text: "Hallo", emoji: "🇩🇪", language: "German" },
    { text: "Ciao", emoji: "🇮🇹", language: "Italian" },
    { text: "Olá", emoji: "🇵🇹", language: "Portuguese" },
    { text: "Hej", emoji: "🇸🇪", language: "Swedish" },
    { text: "こんにちは", emoji: "🇯🇵", language: "Japanese" },
    { text: "안녕하세요", emoji: "🇰🇷", language: "Korean" },
    { text: "مرحبا", emoji: "🇸🇦", language: "Arabic" },
    { text: "Привет", emoji: "🇷🇺", language: "Russian" },
    { text: "नमस्ते", emoji: "🇮🇳", language: "Hindi" },
    { text: "你好", emoji: "🇨🇳", language: "Chinese (Mandarin)" },
    { text: "Halo", emoji: "🇮🇩", language: "Indonesian" },
    { text: "Salam", emoji: "🇮🇷", language: "Persian" },
    { text: "Tere", emoji: "🇪🇪", language: "Estonian" },
    { text: "Kamusta", emoji: "🇵🇭", language: "Filipino" },
    { text: "Sveiki", emoji: "🇱🇻", language: "Latvian" },
    { text: "Zdravo", emoji: "🇷🇸", language: "Serbian" },
    { text: "Merhaba", emoji: "🇹🇷", language: "Turkish" },
    { text: "Sawubona", emoji: "🇿🇦", language: "Zulu" },
    { text: "Kia ora", emoji: "🇳🇿", language: "Maori" },
    { text: "Shalom", emoji: "🇮🇱", language: "Hebrew" },
    { text: "Sannu", emoji: "🇳🇬", language: "Hausa" },
    { text: "Salve", emoji: "🏛️", language: "Latin" },
    { text: "Dzień dobry", emoji: "🇵🇱", language: "Polish" },
    { text: "Γειά σου", emoji: "🇬🇷", language: "Greek" },
    { text: "Sveiki", emoji: "🇱🇹", language: "Lithuanian" },
    { text: "Cześć", emoji: "🇵🇱", language: "Polish (Informal)" },
    { text: "Xin chào", emoji: "🇻🇳", language: "Vietnamese" },
    { text: "Hallo", emoji: "🇳🇱", language: "Dutch" },
    { text: "Hoi", emoji: "🇳🇱", language: "Dutch (Informal)" },
    { text: "Selamat datang", emoji: "🇲🇾", language: "Malay" },
    { text: "Sawadee", emoji: "🇹🇭", language: "Thai" },
    { text: "God dag", emoji: "🇩🇰", language: "Danish" },
    { text: "Saluton", emoji: "🌍", language: "Esperanto" },
    { text: "Yassas", emoji: "🇬🇷", language: "Greek (Formal)" },
    { text: "Servus", emoji: "🇦🇹", language: "Austrian German" },
    { text: "Aloha", emoji: "🌺", language: "Hawaiian" },
    { text: "Bula", emoji: "🇫🇯", language: "Fijian" },
    { text: "Bonjourno", emoji: "🇲🇨", language: "Monégasque" },
    { text: "Hallo", emoji: "🇧🇪", language: "Flemish" },
    { text: "Moin", emoji: "🇩🇪", language: "North German" },
    { text: "Habari", emoji: "🇰🇪", language: "Swahili" },
    { text: "Sawasdee", emoji: "🇹🇭", language: "Thai (Formal)" },
    { text: "Sláinte", emoji: "🇮🇪", language: "Irish Gaelic" },
    { text: "Tashi Delek", emoji: "🇧🇹", language: "Tibetan" },
    { text: "Namaskar", emoji: "🇳🇵", language: "Nepali" },
    { text: "Mingalaba", emoji: "🇲🇲", language: "Burmese" },
]

const Home = () => {
    const todayGreeting = useMemo(() => {
        const index = new Date().getDate() % greetings.length
        return greetings[index]
    }, [])

    return (
        <div>
            <Tooltip title={`In ${todayGreeting.language}`}>
                <h1
                    className="text-2xl font-semibold mb-6"
                >
                    {todayGreeting.text} {todayGreeting.emoji}
                </h1>
            </Tooltip>
        </div>
    )
}

export default Home
