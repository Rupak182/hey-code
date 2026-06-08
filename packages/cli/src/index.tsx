import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Header } from "./components/header";
import { StatusBar } from "./components/status-bar";
import { InputBar } from "./components/input-bar";
import { ToastProvider } from "./components/providers/toast";
import { KeyboardLayerProvider } from "./components/providers/keyboard-layer";
import { DialogProvider } from "./components/providers/dialog";
import { ThemeProvider, useTheme } from "./components/providers/theme";


function ThemedRoot() {
  const { colors } = useTheme()
  return (
    <box
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.background}
      width="100%"
      height="100%"
      gap={2}
    >
      <Header />
      <box width="100%" maxWidth={78} paddingX={2} >
        <InputBar onSubmit={() => { }} />
      </box>
    </box>
  )
}

function App() {
  return (
    <ThemeProvider>
      <KeyboardLayerProvider>
        <DialogProvider>
          <ToastProvider>
            <ThemedRoot />
          </ToastProvider>
        </DialogProvider>
      </KeyboardLayerProvider>
    </ThemeProvider>
  );
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false
});
createRoot(renderer).render(<App />);
