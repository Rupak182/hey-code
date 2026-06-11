import { DialogProvider } from "../components/providers/dialog";
import { KeyboardLayerProvider } from "../components/providers/keyboard-layer";
import { PromptConfigProvider } from "../components/providers/prompt-config";
import { ThemeProvider } from "../components/providers/theme";
import { ToastProvider } from "../components/providers/toast";
import { ThemedRoot } from "./themed-root";
import { Outlet } from "react-router";

export function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <KeyboardLayerProvider>
          <DialogProvider>
            <PromptConfigProvider>
              <ThemedRoot>
                <Outlet />
              </ThemedRoot>
            </PromptConfigProvider>
          </DialogProvider>
        </KeyboardLayerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};