"use client"

import { useState } from "react"

import Register from "@modules/account/components/register"
import Login from "@modules/account/components/login"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

const LoginTemplate = ({
  googleError,
  googleLoginPending,
}: {
  googleError?: string
  googleLoginPending?: boolean
}) => {
  const [currentView, setCurrentView] = useState("sign-in")

  const tabs = [
    { view: LOGIN_VIEW.SIGN_IN, label: "Giriş yap" },
    { view: LOGIN_VIEW.REGISTER, label: "Kayıt ol" },
  ]

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 xsmall:p-8 small:p-10">
        <div className="mb-8 grid grid-cols-2 rounded-full bg-black/[0.05] p-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.view}
              type="button"
              role="tab"
              aria-selected={currentView === tab.view}
              onClick={() => setCurrentView(tab.view)}
              className={
                currentView === tab.view
                  ? "h-10 rounded-full bg-white text-sm font-semibold text-black shadow-sm"
                  : "h-10 rounded-full text-sm font-medium text-black/60 hover:text-black"
              }
              data-testid={tab.view === LOGIN_VIEW.REGISTER ? "register-tab" : "sign-in-tab"}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {currentView === "sign-in" ? (
          <Login
            setCurrentView={setCurrentView}
            googleError={googleError}
            googleLoginPending={googleLoginPending}
          />
        ) : (
          <Register setCurrentView={setCurrentView} />
        )}
      </div>
    </div>
  )
}

export default LoginTemplate
