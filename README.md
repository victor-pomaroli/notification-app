# Ping

**Faça acontecer.** App de tarefas, rotinas e eventos para Android com lembretes que têm personalidade, widget de tela inicial e tudo salvo no próprio aparelho.

- **O que é o Ping, para quem é e como funciona:** [PRODUCT.md](PRODUCT.md)
- **Versões e o que mudou em cada uma:** [CHANGELOG.md](CHANGELOG.md)

Versão atual: **1.3.0**

## Destaques

- Aba **Hoje** com o que passou da hora, a agenda e o que ainda vem, e confetes quando está tudo feito.
- **Tarefas** com etapas, **rotinas** diárias e **eventos** com avisos antes de começar.
- **Calendário** mensal.
- Notificações em três personalidades, com botões **Concluir** e **Adiar**.
- **Widget** Android que conclui tarefas sem abrir o app.
- Quatro temas: escuro, claro, rosa e azul. Sem conta e sem nuvem.

## Stack

React Native + Expo SDK 58, Expo Router, expo-sqlite, expo-notifications e react-native-android-widget.

## Executar

```bash
npm install
npx expo start
```

Teste notificações e o widget em um dispositivo Android real.

## APK

O workflow **Build Android APK** (`.github/workflows/android-apk.yml`) gera um APK arm64 de release a cada push na branch `fix/android-apk-ci`. O arquivo fica nos artefatos da execução.

## Versionamento

O projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/). As regras e o passo a passo para lançar uma versão estão no topo do [CHANGELOG.md](CHANGELOG.md).
