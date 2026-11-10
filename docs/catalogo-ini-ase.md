# Catálogo de chaves do ARK ASE (Fase 0)

Gerado em 04/11/2026 para o servidor ARK: Survival Evolved build 361.7. Nada foi alterado no launcher nem no servidor.

## Como cada chave foi verificada

- **D (dump)**: a chave aparece nos ini que o próprio jogo grava (Game.ini e GameUserSettings.ini do seu servidor). Vale para o ASE 361.7.
- **B (binário)**: o texto do nome da chave existe dentro de `ShooterGameServer.exe` (build 361.7, ASE). Busquei em ASCII e em UTF-16. Prova que o nome existe neste build, mas não diz sozinho o arquivo, a seção nem o padrão.
- **W (wiki)**: a página ark.wiki.gg/wiki/Server_configuration. Ela mistura ASA e ASE, por isso a wiki sozinha nunca basta: uma chave só entra como **verificada** se também existir no binário ou no dump. Arquivo, seção, tipo e padrão vêm daqui.
- **código**: já implementada no launcher (`server_ini.rs` e `ServerOptionsTab.tsx`).

Os padrões vêm da wiki, e não foram confirmados num servidor ASE zerado. Os valores no seu arquivo podem diferir porque ele veio de um mundo solo (veja os avisos abaixo).

Seção `[/script/shootergame.shootergamemode]` é a do Game.ini; `[ServerSettings]` e `[/Script/Engine.GameSession]` são do GameUserSettings.ini.

## Resumo

- Verificadas e novas: **74**
- Já existiam no launcher: **42**
- Descartadas: **7**
- Não verificadas (só INI personalizado, com aviso): **1**

## Avisos sobre o seu servidor (precisam de decisão)

1. **`bUseSingleplayerSettings=True` e `MaxDifficulty=True` estão no seu Game.ini.** Vieram do jogo solo. A wiki diz que a primeira deixa as regras "mais equilibradas para um jogador". Isso pode estar mudando as taxas do servidor sem você ver. O launcher não mexe nelas; quer que apareçam como opção?
2. **`GlobalSpoilingTimeMultiplier`, `GlobalItemDecompositionTimeMultiplier` e `GlobalCorpseDecompositionTimeMultiplier` estão em 0.0.** A wiki diz que o padrão é 1.0 e não explica o efeito de 0. A tela vai mostrar o valor do arquivo, não o padrão.
3. **Valores do seu arquivo diferentes do padrão da wiki:** bDisableFriendlyFire=True, bAllowPlatformSaddleMultiFloors=True, AutoSavePeriodMinutes=5.0, DinoHarvestingDamageMultiplier=3.2 (este é o padrão).
4. **Índice 11 (velocidade de fabricação)** das tabelas de atributos não aparece nos arquivos que o jogo grava (só vai de 0 a 10). Tratado como não verificado. O **índice 6 (temperatura)** é "stat sem uso" segundo a wiki.
5. **ServerAdminPassword** continua em texto no ini porque o servidor precisa dele. O launcher só vai mostrar "definida" ou "não definida".

## Catálogo


### 1 Experiência e progressão

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| KillXPMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| HarvestXPMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| CraftXPMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| GenericXPMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| SpecialXPMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| ExplorerNoteXPMultiplier | - | - | - | - | descartada: não existe no ASE | sem B, sem W | Não está no executável 361.7 nem na wiki. Provavelmente do ASA. |
| BossKillXPMultiplier | - | - | - | - | descartada: não existe no ASE | sem B, sem W | Não está no executável 361.7 nem na wiki. Provavelmente do ASA. |
| AlphaKillXPMultiplier | - | - | - | - | descartada: não existe no ASE | sem B, sem W | Não está no executável 361.7 nem na wiki. Provavelmente do ASA. |
| WildKillXPMultiplier | - | - | - | - | descartada: não existe no ASE | sem B, sem W | Não está no executável 361.7 nem na wiki. Provavelmente do ASA. |
| CaveKillXPMultiplier | - | - | - | - | descartada: não existe no ASE | sem B, sem W | Não está no executável 361.7 nem na wiki. Provavelmente do ASA. |
| LevelExperienceRampOverrides | Game.ini | [/script/shootergame.shootergamemode] | lista (ExperiencePointsForLevel[n]=) | sem padrão | verificada | B W | Estruturada |
| OverrideMaxExperiencePointsPlayer | Game.ini | [/script/shootergame.shootergamemode] | inteiro >= 0 | 0 (desligado) | verificada | D B W |  |
| OverrideMaxExperiencePointsDino | Game.ini | [/script/shootergame.shootergamemode] | inteiro >= 0 | 0 (desligado) | verificada | D B W |  |
| OverridePlayerLevelEngramPoints | Game.ini | [/script/shootergame.shootergamemode] | inteiro, uma linha por nível | sem padrão | verificada | B W | Linhas repetidas, uma por nível |

### 2 Coleta e recursos

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| PlayerHarvestingDamageMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| DinoHarvestingDamageMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 3.2 | verificada | D B W |  |
| HarvestHealthMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | verificada | B W |  |
| HarvestAmountMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| ResourcesRespawnPeriodMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| FishingLootQualityMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| SupplyCrateLootQualityMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| CropGrowthSpeedMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| CropDecaySpeedMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |

### 3 Dinossauros: atributos

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| PerLevelStatsMultiplier_DinoWild[0..10] | Game.ini | [/script/shootergame.shootergamemode] | float >= 0, índices 0 a 10 | 1.0 | verificada | D B W | Índice 11 só na wiki: não verificado neste build. Índice 6 (temperatura) é 'stat sem uso' na wiki. |
| PerLevelStatsMultiplier_DinoTamed[0..10] | Game.ini | [/script/shootergame.shootergamemode] | float >= 0, índices 0 a 10 | 1.0 | verificada | D B W | Seu arquivo: [0] e [8] = 0.6 |
| PerLevelStatsMultiplier_DinoTamed_Add[0..10] | Game.ini | [/script/shootergame.shootergamemode] | float >= 0, índices 0 a 10 | 1.0 | verificada | D B W | Seu arquivo: [0] e [8] = 0.6 |
| PerLevelStatsMultiplier_DinoTamed_Affinity[0..10] | Game.ini | [/script/shootergame.shootergamemode] | float >= 0, índices 0 a 10 | 1.0 | verificada | D B W | Seu arquivo: [0] e [8] = 0.44 |
| DinoDamageMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DinoResistanceMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| TamedDinoDamageMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| TamedDinoResistanceMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DinoCharacterFoodDrainMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DinoCharacterStaminaDrainMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DinoCharacterHealthRecoveryMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DinoCountMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DinoTurretDamageMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| DinoClassDamageMultipliers | Game.ini | [/script/shootergame.shootergamemode] | lista (ClassName="..._C",Multiplier=n) | sem padrão | verificada | B W | Estruturada, uma linha por espécie |
| DinoClassResistanceMultipliers | Game.ini | [/script/shootergame.shootergamemode] | lista (ClassName="..._C",Multiplier=n) | sem padrão | verificada | B W | Estruturada, uma linha por espécie |
| DinoSpawnWeightMultipliers | Game.ini | [/script/shootergame.shootergamemode] | lista (DinoNameTag,SpawnWeightMultiplier,OverrideSpawnLimitPercentage,SpawnLimitPercentage) | sem padrão | verificada | B W | Estruturada |

### 4 Jogador

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| PerLevelStatsMultiplier_Player[0..10] | Game.ini | [/script/shootergame.shootergamemode] | float >= 0, índices 0 a 10 | 1.0 | verificada | D B W | Índice 6 travado (sem uso). Ver a seção Atributos |
| PlayerDamageMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| PlayerResistanceMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| PlayerCharacterFoodDrainMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| PlayerCharacterWaterDrainMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| PlayerCharacterStaminaDrainMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| PlayerCharacterHealthRecoveryMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |

### 5 Reprodução

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| EggHatchSpeedMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| BabyMatureSpeedMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| MatingIntervalMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| MatingSpeedMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | B W |  |
| LayEggIntervalMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| BabyFoodConsumptionSpeedMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| BabyImprintAmountMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | B W |  |
| BabyCuddleIntervalMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| BabyCuddleGracePeriodMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| BabyCuddleLoseImprintQualitySpeedMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W |  |
| BabyImprintingStatScaleMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W | Não estava na sua lista, mas já está no seu Game.ini: é outra chave que BabyImprintAmountMultiplier |
| AllowAnyoneBabyImprintCuddle | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| AllowRaidDinoFeeding | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |

### 6 Itens e deterioração

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| GlobalSpoilingTimeMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W | Seu arquivo tem 0.0: o efeito de 0 não está documentado |
| GlobalItemDecompositionTimeMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W | Seu arquivo tem 0.0: o efeito de 0 não está documentado |
| GlobalCorpseDecompositionTimeMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | D B W | Seu arquivo tem 0.0: o efeito de 0 não está documentado |
| ItemStackSizeMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | verificada | D B W |  |
| ClampItemSpoilingTimes | GameUserSettings.ini | [ServerSettings] | bool | False | verificada | B W |  |
| ClampItemStats | GameUserSettings.ini | [ServerSettings] | bool | False | verificada | B W |  |
| MaxItemQuantity | - | - | - | - | descartada: não é chave | B, W | Na wiki é só um campo dentro de ConfigOverrideItemMaxQuantity. Proposta: expor a chave estruturada abaixo. |
| ConfigOverrideItemMaxQuantity | Game.ini | [/script/shootergame.shootergamemode] | (ItemClassString="..",Quantity=(MaxItemQuantity=n,bIgnoreMultiplier=bool)) | sem padrão | verificada | B W | Proposta nova, estruturada (substitui MaxItemQuantity) |
| PassiveTameIntervalMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | B W |  |

### 7 Construção

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| TheMaxStructuresInRange | GameUserSettings.ini | [ServerSettings] | número | 10500 | verificada | D B W | A wiki diz inteiro; o jogo grava como 10500.000000 |
| MaxPlatformSaddleStructureLimit | GameUserSettings.ini | [ServerSettings] | inteiro | 75 | verificada | B W |  |
| StructurePickupTimeAfterPlacement | GameUserSettings.ini | [ServerSettings] | float >= 0 | 30.0 | verificada | D B W |  |
| StructurePickupHoldDuration | GameUserSettings.ini | [ServerSettings] | float >= 0 | 0.5 | verificada | D B W |  |
| AlwaysAllowStructurePickup | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| bDisableStructurePlacementCollision | Game.ini | [/script/shootergame.shootergamemode] | bool | False | verificada | D B W |  |
| bAllowPlatformSaddleMultiFloors | Game.ini | [/script/shootergame.shootergamemode] | bool | False | verificada | D B W | Seu arquivo tem True |
| FastDecayUnsnappedCoreStructures | GameUserSettings.ini | [ServerSettings] | bool | False | verificada | B W | Só vale junto com FastDecayInterval |
| FastDecayInterval | Game.ini | [/script/shootergame.shootergamemode] | inteiro (segundos) | 43200 | verificada | B W |  |
| LimitTurretsInRange | Game.ini | [/script/shootergame.shootergamemode] | float | 10000.0 | verificada | B W |  |
| LimitTurretsNum | Game.ini | [/script/shootergame.shootergamemode] | inteiro | 100 | verificada | B W | Não estava na sua lista, mas é o limite em si |
| bLimitTurretsInRange | Game.ini | [/script/shootergame.shootergamemode] | bool | True | verificada | B W | Liga e desliga o limite de torres |
| LimitTurretsRange | - | - | - | - | não verificada | B | Existe no executável, mas a wiki só documenta LimitTurretsInRange. Só no INI personalizado, com aviso. |
| AllowCaveBuildingPvE | GameUserSettings.ini | [ServerSettings] | bool | ver código | já existe | código |  |
| AllowCaveBuildingPvP | GameUserSettings.ini | [ServerSettings] | bool | ver código | já existe | código |  |
| StructureDamageMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | ver código | já existe | código |  |
| StructureResistanceMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | ver código | já existe | código |  |
| PvEStructureDecayPeriodMultiplier | GameUserSettings.ini | [ServerSettings] | float >= 0 | ver código | já existe | código |  |
| DisableStructureDecayPvE | GameUserSettings.ini | [ServerSettings] | bool | ver código | já existe | código |  |

### 8 PvP e PvE

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| serverPVE | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| ServerHardcore | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| PreventOfflinePvP | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| PreventTribeAlliances | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| DisablePvEGamma | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| EnablePvPGamma | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| AllowFlyerCarryPVE | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| DisableDinoDecayPvE | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| DisableStructureDecayPvE | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| PreventOfflinePvPInterval | GameUserSettings.ini | [ServerSettings] | float >= 0 | 0.0 | verificada | D B W |  |
| DisablePvEFlyerCarry | - | - | - | - | descartada: não existe no ASE | sem B, sem W | O nome certo é AllowFlyerCarryPVE, que já existe |
| bDisableFriendlyFire | Game.ini | [/script/shootergame.shootergamemode] | bool | False | verificada | D B W | Seu arquivo tem True |
| bPvEDisableFriendlyFire | Game.ini | [/script/shootergame.shootergamemode] | bool | False | verificada | B W | Não é redundante com bDisableFriendlyFire: esta vale só no PvE |
| bAutoPvETimer | Game.ini | [/script/shootergame.shootergamemode] | bool | False | verificada | D B W | Necessária para AutoPvEStart/StopTimeSeconds |
| bAutoPvEUseSystemTime | Game.ini | [/script/shootergame.shootergamemode] | bool | False | verificada | D B W | Necessária para AutoPvEStart/StopTimeSeconds |
| AutoPvEStartTimeSeconds | Game.ini | [/script/shootergame.shootergamemode] | float 0 a 86400 | 0.0 | verificada | D B W |  |
| AutoPvEStopTimeSeconds | Game.ini | [/script/shootergame.shootergamemode] | float 0 a 86400 | 0.0 | verificada | D B W |  |

### 9 Mundo e clima

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| DayCycleSpeedScale | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DayTimeSpeedScale | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| NightTimeSpeedScale | GameUserSettings.ini | [ServerSettings] | float >= 0 | 1.0 | já existe | código |  |
| DisableWeatherFog | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| UseCorpseLifeSpanMultiplier | Game.ini | [/script/shootergame.shootergamemode] | float >= 0 | 1.0 | verificada | B W |  |
| RandomSupplyCratePoints | GameUserSettings.ini | [ServerSettings] | bool | False | verificada | B W | A wiki avisa: pode deixar artefatos inacessíveis em Ragnarok |
| ForceAllowCaveFlyers | GameUserSettings.ini | [ServerSettings] | bool | False | verificada | D B W | A wiki chama de opção de linha de comando, mas este servidor já grava como chave do ini |
| PreventSpawnAnimations | GameUserSettings.ini | [ServerSettings] | bool | False | verificada | B W |  |

### 10 Spawn e substituição

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| NPCReplacements | Game.ini | [/script/shootergame.shootergamemode] | (FromClassName="..._C",ToClassName="..._C") | sem padrão | verificada | B W | Estruturada |

### 11 Engramas

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| OverrideNamedEngramEntries | Game.ini | [/script/shootergame.shootergamemode] | (EngramClassName="EngramEntry_..._C",EngramHidden,EngramPointsCost,EngramLevelRequirement,RemoveEngramPreReq) | sem padrão | verificada | B W | Preferir esta: usa o nome, não o índice |
| OverrideEngramEntries | Game.ini | [/script/shootergame.shootergamemode] | (EngramIndex=n,...) | sem padrão | verificada | B W | Usa o índice do engrama, que muda entre versões e mods: arriscada |
| EngramEntryAutoUnlocks | Game.ini | [/script/shootergame.shootergamemode] | (EngramClassName="..._C",LevelToAutoUnlock=n) | sem padrão | verificada | B W | Estruturada |

### 12 Administração

| Chave | Arquivo | Seção | Tipo | Padrão | Status | Evidência | Nota |
|---|---|---|---|---|---|---|---|
| RCONEnabled | GameUserSettings.ini | [ServerSettings] | bool | False | verificada | D B W | O launcher já lê esta chave; hoje não edita |
| RCONPort | GameUserSettings.ini | [ServerSettings] | inteiro 1-65535 | 27020 | verificada | D B W | O launcher já lê esta chave; hoje não edita |
| ServerAdminPassword | GameUserSettings.ini | [ServerSettings] | texto (segredo) | sem padrão | verificada | D B W | Nunca mostrar o valor |
| AdminLogging | GameUserSettings.ini | [ServerSettings] | bool | False | já existe | código |  |
| ServerAutoForceRespawnWildDinosInterval | GameUserSettings.ini | [ServerSettings] | float >= 0 (segundos) | 0.0 | verificada | B W |  |
| MaxPlayers | GameUserSettings.ini | [/Script/Engine.GameSession] | inteiro | 70 | já existe | código |  |
| ServerPassword | GameUserSettings.ini | [ServerSettings] | texto (segredo) | vazio | já existe | código |  |
| AutoSavePeriodMinutes | GameUserSettings.ini | [ServerSettings] | float | 15.0 | já existe | código | Seu arquivo tem 5.0 |

## Sintaxe das chaves estruturadas

Fase 4 (04/11/2026): todos os nomes de subcampo abaixo existem no ShooterGameServer.exe (texto UTF-16), e cada linha de exemplo passa na ida e volta dos testes (tests/lists.test.ts e ini_catalog.rs). Grupos novos: Spawn de criaturas e Engramas. A rampa de experiência fica em Experiência e a pilha máxima por item em Itens. Uma linha que o launcher não sabe regravar igual deixa a lista só para leitura, e as linhas ficam como estão.

- `NPCReplacements=(FromClassName="MegaRaptor_Character_BP_C",ToClassName="Dodo_Character_BP_C")`
- `DinoSpawnWeightMultipliers=(DinoNameTag=Bronto,SpawnWeightMultiplier=10.0,OverrideSpawnLimitPercentage=True,SpawnLimitPercentage=0.5)`
- `DinoClassDamageMultipliers=(ClassName="MegaRex_Character_BP_C",Multiplier=0.1)` e o mesmo formato em `DinoClassResistanceMultipliers`
- `OverrideNamedEngramEntries=(EngramClassName="EngramEntry_Campfire_C",EngramHidden=False)`
- `OverrideEngramEntries=(EngramIndex=0,EngramHidden=False)`
- `EngramEntryAutoUnlocks=(EngramClassName="EngramEntry_TekTeleporter_C",LevelToAutoUnlock=0)`
- `LevelExperienceRampOverrides=(ExperiencePointsForLevel[0]=1,ExperiencePointsForLevel[1]=5,...)`
- `OverridePlayerLevelEngramPoints=5`, uma linha por nível
- `ConfigOverrideItemMaxQuantity=(ItemClassString="...",Quantity=(MaxItemQuantity=n,bIgnoreMultiplier=bool))`

## Atributos (índices das tabelas PerLevelStatsMultiplier_*)

0 vida, 1 stamina, 2 torpor, 3 oxigênio, 4 comida, 5 água, 6 temperatura (sem uso), 7 peso, 8 dano corpo a corpo, 9 velocidade, 10 fortitude, 11 velocidade de fabricação (não verificado). Fase 3 (04/11/2026): a tabela de valores padrão da wiki (ark.wiki.gg, Server configuration, seção PerLevelStatsMultiplier) lista para dinossauros só os índices 0 a 4 e 7 a 9. Por isso as quatro colunas de dinossauros travam 5 (água), 6 (temperatura) e 10 (fortitude). Para o jogador a wiki lista 0 a 11 e marca só o 6 como sem uso: trava só o 6. O índice 11 continua fora (não verificado neste build). Um índice travado nunca é gravado: a linha que o arquivo já tem fica como está.
