import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import GoogleContinueButton from "@modules/account/components/google-continue-button"
import GoogleLoginRetry from "@modules/account/components/google-login-retry"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  googleError?: string
  googleLoginPending?: boolean
}

const Login = ({ setCurrentView, googleError, googleLoginPending }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <GoogleLoginRetry active={!!googleLoginPending} />
      <h1 className="text-2xl font-bold tracking-tight text-black mb-6">
        Tekrar hoş geldiniz
      </h1>
      {googleLoginPending && (
        <p
          className="text-center text-base text-black mb-8"
          data-testid="google-login-pending-message"
        >
          Google ile giriş tamamlanıyor...
        </p>
      )}
      <p className="text-center text-base text-black/70 mb-8">
        Hesabınıza giriş yapın.
      </p>
      <ErrorMessage error={googleError} data-testid="google-error-message" />
      <GoogleContinueButton />
      <div className="w-full flex items-center gap-x-4 my-6">
        <span className="h-px flex-1 bg-black/10" />
        <span className="text-sm text-black/40">veya</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-6 text-center text-base text-black bg-black/[0.02] border border-black/10 rounded-lg p-4"
          data-testid="login-verification-message"
        >
          <strong>{message.email}</strong> adresine bir doğrulama bağlantısı
          gönderdik. E-postanızı doğruladıktan sonra giriş yapabilirsiniz.
        </div>
      )}
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="E-posta"
            name="email"
            type="email"
            title="Geçerli bir e-posta adresi girin."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Şifre"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          Giriş yap
        </SubmitButton>
      </form>
      <span className="text-center text-black/70 text-sm mt-6">
        Üye değil misiniz?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline"
          data-testid="register-button"
        >
          Kayıt olun
        </button>
        .
      </span>
    </div>
  )
}

export default Login
