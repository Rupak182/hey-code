import { DialogProvider } from "../components/providers/dialog";
import { KeyboardLayerProvider } from "../components/providers/keyboard-layer";
import { ThemeProvider } from "../components/providers/theme";
import { ToastProvider } from "../components/providers/toast";
import { ThemedRoot } from "./themed-root";
import { Outlet } from "react-router";

export function RootLayout(){
return (
    <ThemeProvider>
      <KeyboardLayerProvider>
        <ToastProvider>
          <DialogProvider>
            <ThemedRoot>
                <Outlet/>
            </ThemedRoot>
          </DialogProvider>
        </ToastProvider>
      </KeyboardLayerProvider>
    </ThemeProvider>
  );

}
    