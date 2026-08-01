"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import GoogleContinueButton from "@modules/account/components/google-continue-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-2xl font-bold tracking-tight text-black mb-6">
        Hesap oluşturun
      </h1>
      <p className="text-center text-base text-black/70 mb-4">
        Packshop&apos;ta hesap oluşturun ve alışverişe hemen başlayın.
      </p>
      <GoogleContinueButton />
      <div className="w-full flex items-center gap-x-4 my-6">
        <span className="h-px flex-1 bg-black/10" />
        <span className="text-sm text-black/40">veya</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-4 text-center text-base text-black bg-black/[0.02] border border-black/10 rounded-lg p-4"
          data-testid="register-verification-message"
        >
          <strong>{message.email}</strong> adresine bir doğrulama bağlantısı
          gönderdik. Gelen kutunuzu kontrol edip e-postanızı doğruladıktan
          sonra giriş yapabilirsiniz.
        </div>
      )}
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Ad"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="Soyad"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="E-posta"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Telefon"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Şifre"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <span className="text-center text-black/70 text-sm mt-6">
          Hesap oluşturarak Packshop&apos;un{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            Gizlilik Politikası
          </LocalizedClientLink>{" "}
          ve{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            Kullanım Şartları
          </LocalizedClientLink>
          &apos;nı kabul etmiş olursunuz.
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          Kayıt ol
        </SubmitButton>
      </form>
      <span className="text-center text-black/70 text-sm mt-6">
        Zaten üye misiniz?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          Giriş yapın
        </button>
        .
      </span>
    </div>
  )
}

export default Register
