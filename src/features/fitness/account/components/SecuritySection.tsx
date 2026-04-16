import { Link } from 'react-router-dom'
import { Button, Card } from '@/components/ui'
import { HiOutlineLogout, HiOutlineKey } from 'react-icons/hi'

interface SecuritySectionProps {
    isSigningOut: boolean
    onSignOut: () => Promise<void>
}

const SecuritySection = ({ isSigningOut, onSignOut }: SecuritySectionProps) => {
    return (
        <Card>
            <h5>Sécurité / Actions compte</h5>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Actions essentielles liées à l’accès au compte.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
                <Button
                    size="sm"
                    icon={<HiOutlineLogout />}
                    loading={isSigningOut}
                    onClick={onSignOut}
                >
                    Se déconnecter
                </Button>

                <Button
                    size="sm"
                    asElement={Link}
                    to="/forgot-password"
                    icon={<HiOutlineKey />}
                >
                    Réinitialiser le mot de passe
                </Button>
            </div>
        </Card>
    )
}

export default SecuritySection
