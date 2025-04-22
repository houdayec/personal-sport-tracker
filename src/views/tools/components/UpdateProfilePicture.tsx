import { useEffect, useState } from "react"
import { updateProfile } from "firebase/auth"
import { auth } from "@/firebase"
import { Button } from "@/components/ui"

const UpdateProfileOnce = () => {
    const [updated, setUpdated] = useState(false)

    const handleClick = async () => {
        if (!updated && auth.currentUser) {
            const name = "Melissa Llorens"
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=9d174d&bold=true&format=svg`

            updateProfile(auth.currentUser, {
                displayName: name,
                photoURL: avatarUrl,
            })
                .then(() => {
                    console.log("✅ Profile updated!")
                    setUpdated(true)
                })
                .catch((error) => {
                    console.error("❌ Failed to update profile:", error)
                })
        }
    }
    return (
        <Button onClick={handleClick}>
            Update profile name and picture
        </Button>
    )
}

export default UpdateProfileOnce
