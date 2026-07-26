import { loginWithGoogle } from "@lib/data/customer"
import { SubmitButton } from "@modules/checkout/components/submit-button"

const GoogleContinueButton = () => {
  return (
    <form action={loginWithGoogle} className="w-full">
      <SubmitButton
        variant="secondary"
        className="w-full"
        data-testid="google-continue-button"
      >
        Continue with Google
      </SubmitButton>
    </form>
  )
}

export default GoogleContinueButton
