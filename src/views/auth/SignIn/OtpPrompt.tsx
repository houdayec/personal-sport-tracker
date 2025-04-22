import { useState } from 'react'

type Props = {
    onSubmit: (otpCode: string) => void
    onCancel?: () => void
}

const OtpPrompt = ({ onSubmit, onCancel }: Props) => {
    const [code, setCode] = useState('')

    const handleSubmit = () => {
        if (!code) return
        onSubmit(code)
    }

    return (
        <div className="p-4 border rounded bg-white shadow-md max-w-xs mx-auto">
            <h2 className="text-lg font-semibold mb-2">Enter TOTP Code</h2>
            <input
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-between">
                <button
                    onClick={handleSubmit}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Submit
                </button>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="text-gray-500 px-4 py-2"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    )
}

export default OtpPrompt
