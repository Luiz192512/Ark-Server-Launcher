# ADR-001: Stack do launcher ARK

Status: proposto (aguardando aprovação do dono)

## Evidências do ambiente (Fase 0, somente leitura)

| Item | Resultado |
|---|---|
| Edição do ARK | Survival Evolved (ASE), servidor dedicado |
| Instalação | `D:\SteamLibrary\steamapps\common\ARK Survival Evolved Dedicated Server` |
| Executável | `ShooterGame\Binaries\Win64\ShooterGameServer.exe` |
| Comando em uso hoje | `ShooterGameServer.exe TheIsland?listen?SessionName=ENZ -server -log` |
| Save existente | `TheIsland.ark` (34 MB) |
| Mapas em Content/Maps | Aberration, Abyss, Extinction, Genesis, Genesis2, ScorchedEarth, TheIslandSubMaps |
| Mapas em Content/Mods | CrystalIsles, FjordurOfficial, LostIsland, Ragnarok, TheCenter, Valguero (pastas de mapa, a confirmar) |
| Node / npm | v25.8.2 / 11.11.1 |
| Rust / cargo | AUSENTE |
| .NET SDK | AUSENTE |
| Go | AUSENTE |
| Build Tools | Visual Studio 2026 Build Tools presentes |
| WebView2 | 156.0.4314.42 |

## Matriz ponderada (notas de 1 a 5, julgamento do analista)

Pesos: UI 5, supervisão 5, footprint 3, handoff do Claude Design 4, velocidade 4, instalador 3, controle remoto 3 (soma 27).

| Stack | UI | Superv. | Footprint | Handoff | Veloc. | Instal. | Remoto | Total |
|---|---|---|---|---|---|---|---|---|
| Tauri 2 (Rust + React/TS) | 5 | 5 | 5 | 5 | 3 | 4 | 4 | 4.48 |
| Electron (Node + React/TS) | 5 | 4 | 2 | 5 | 5 | 4 | 4 | 4.26 |
| Go + Wails | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 4.19 |
| .NET 8 WPF/WinUI 3 | 3 | 5 | 4 | 2 | 3 | 3 | 4 | 3.44 |
| Flutter Windows | 4 | 3 | 3 | 2 | 3 | 3 | 3 | 3.04 |

Notas: a velocidade de Tauri, Wails e .NET recebe 3 porque Rust, Go e o SDK .NET não estão instalados. Electron recebe 5 porque Node já existe. Python está fora por restrição dura.

## Decisão proposta

Tauri 2 com núcleo em Rust e UI em React + TypeScript + Vite.

Motivos: o servidor ARK consome muita RAM, então o launcher precisa ser leve; Rust supervisiona processos com confiabilidade; a UI web recebe o HTML/CSS do Claude Design quase direto.

Custo: instalar o Rust (rustup) antes da Fase 2. As Build Tools do Visual Studio e o WebView2 já estão presentes.

Alternativa se o dono não quiser instalar Rust: Electron (segunda colocada, nenhuma instalação extra, ao custo de mais RAM ociosa).
