import * as React from "react"
import { IconEye, IconEyeOff } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

function PasswordInput(props: Omit<React.ComponentProps<"input">, "type">) {
  const { t } = useTranslation("common")
  const [isPasswordShown, setIsPasswordShown] = React.useState(false)
  return (
    <InputGroup className="max-md:h-11">
      <InputGroupInput type={isPasswordShown ? "text" : "password"} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={isPasswordShown ? t("a11y.hidePassword") : t("a11y.showPassword")}
          aria-pressed={isPasswordShown}
          className="max-md:size-9"
          onClick={() => setIsPasswordShown((isShown) => !isShown)}
        >
          {isPasswordShown ? <IconEyeOff /> : <IconEye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

export { PasswordInput }
