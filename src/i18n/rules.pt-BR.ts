// Texts of the SERVIDOR E MAPA tab: one label and one explanation per catalog key
// (data/ini-catalog.json). tests/i18n.test.ts checks that every catalog key has both.
export const rulesPtBR = {
  "rules.hint":
    "Regras do jogo gravadas no Game.ini e no GameUserSettings.ini do servidor. Só dá para salvar com o servidor parado.",
  "rules.search": "BUSCAR CONFIGURAÇÃO",
  "rules.searchPlaceholder": "Nome ou chave do ini",
  "rules.searchResults": "Resultados da busca",
  "rules.searchTitle": "RESULTADOS PARA “{query}”",
  "rules.searchCount": "{count} campos em {groups} categorias.",
  "rules.searchNone":
    "Nada encontrado para “{query}”. A busca procura no nome, na explicação e na chave do ini.",
  "rules.clearSearch": "Limpar busca",
  "rules.categories": "Categorias de regras",
  "rules.category": "CATEGORIA",
  "rules.fields": "{count} campos",
  "rules.fieldsOne": "1 campo",
  "rules.lists": "{count} listas",
  "rules.listsOne": "1 lista",
  "rules.tableOne": "1 tabela",
  "rules.unsavedCount": "{count} alterações não salvas",
  "rules.unsavedOne": "1 alteração não salva",
  "rules.noUnsaved": "Nada para salvar.",
  "rules.withErrors": "{count} com erro. Corrija para salvar.",
  "rules.backupFirst": "Antes de gravar, o launcher faz backup dos dois ini.",
  "rules.default": "Padrão: {value}",
  "rules.noDefault": "Sem padrão",
  "rules.unsaved": "Alteração não salva",
  "rules.differs": "Fora do padrão",
  "rules.restore": "Voltar ao padrão",
  "rules.restoreField": "Voltar ao padrão: {field}",
  "rules.restoreCategory": "Voltar ao padrão (categoria)",
  "rules.info": "Explicação: {field}",
  "rules.on": "Ligado",
  "rules.off": "Desligado",
  "rules.secretSet": "definida",
  "rules.secretUnset": "não definida",
  "rules.secretPlaceholder": "Nova senha",
  "rules.secretHint":
    "A senha atual nunca aparece. Deixe vazio para manter a que já existe.",
  "rules.discard": "DESCARTAR",
  "rules.save": "SALVAR",
  "rules.saving": "SALVANDO…",
  "rules.saved": "Salvo. O backup dos ini foi feito antes de gravar.",
  "rules.undo": "Desfazer",
  "rules.discarded": "Alterações descartadas.",
  "rules.categoryRestored":
    "{category} voltou ao padrão no rascunho. Salve para gravar.",
  "rules.serverRunning":
    "O servidor está rodando. Dá para mudar valores, mas só para salvar com ele parado, porque ele reescreve o ini ao fechar.",
  "rules.loading": "Lendo Game.ini e GameUserSettings.ini…",
  "rules.loadFailed": "Não consegui ler as regras do servidor: {reason}",
  "rules.saveFailed":
    "Não consegui gravar: {reason}. Suas alterações continuam aqui.",
  "rules.part": "Parte da categoria",
  "rules.part.fields": "Campos ({count})",
  "rules.part.table": "Atributos por nível ({count} colunas)",
  "rules.table.caption":
    "Quanto cada ponto de nível aumenta cada atributo, em vezes. Padrão: {value} em todas as células.",
  "rules.table.stat": "Atributo",
  "rules.table.actions": "Ações da linha",
  "rules.table.row": "Linha {row}",
  "rules.table.column": "Coluna {column}",
  "rules.table.whole": "Tabela de atributos",
  "rules.table.restoreWhole": "Voltar ao padrão (tabela)",
  "rules.table.restoreFooter": "Voltar ao padrão por coluna",
  "rules.table.locked":
    "Travado: este atributo não tem efeito aqui. O valor do arquivo fica como está.",
  "rules.table.lockedCell": "Sem efeito",
  "rules.table.cell": "{stat}, {column}",
  "rules.error.number": "Use um número a partir de 0, com ponto. Exemplo: 1.5.",
  "rules.error.int": "Use um número inteiro, sem vírgula nem ponto.",
  "rules.error.max": "O valor máximo é {max}.",
  "rules.error.players": "Use um número inteiro de 1 a 255.",
  "rules.error.port": "Use uma porta de 1 a 65535.",
  "rules.error.text": "Use até 64 caracteres, sem quebra de linha.",
  "rules.error.required": "Campo obrigatório.",
  "rules.error.class":
    "Use o nome da classe, terminado em _C. Exemplo: Spino_Character_BP_C.",
  "rules.error.tag": "Use só letras, números e _. Exemplo: Bronto.",
  "rules.error.ints":
    "Use números inteiros separados por vírgula. Exemplo: 10, 35, 75.",
  "rules.error.list": "Há linhas com erro nesta lista.",

  "rules.list.restore": "Voltar ao padrão (remover todas)",
  "rules.list.readOnly":
    "O Game.ini tem linhas desta lista que o launcher não sabe editar sem perder algo. Elas ficam como estão. Para mudar, edite o Game.ini com o servidor parado.",
  "rules.list.cell": "{row}, {column}",
  "rules.list.boolDefault": "Padrão",
  "rules.list.yes": "Sim",
  "rules.list.no": "Não",
  "rules.list.example": "Ex.: {value}",
  "rules.list.removed": "{row}: linha removida do rascunho.",
  "rules.list.rowHead": "Linha",
  "rules.list.remove": "Remover",
  "rules.list.removeRow": "Remover: {row}",
  "rules.list.empty": "Nenhuma linha. O jogo usa o comportamento padrão.",
  "rules.list.add": "+ Adicionar linha",
  "rules.list.preview": "COMO FICA NO GAME.INI",
  "rules.list.previewEmpty": "(nenhuma linha)",

  "stat.0": "Vida",
  "stat.1": "Stamina",
  "stat.2": "Torpor",
  "stat.3": "Oxigênio",
  "stat.4": "Comida",
  "stat.5": "Água",
  "stat.6": "Temperatura",
  "stat.7": "Peso",
  "stat.8": "Dano corpo a corpo",
  "stat.9": "Velocidade",
  "stat.10": "Fortitude",

  "rules.cat.general": "Geral",
  "rules.cat.xp": "Experiência",
  "rules.cat.harvest": "Coleta e recursos",
  "rules.cat.creatures": "Dinossauros",
  "rules.cat.player": "Jogador",
  "rules.cat.breeding": "Reprodução",
  "rules.cat.items": "Itens",
  "rules.cat.building": "Construção",
  "rules.cat.pvp": "PvP e PvE",
  "rules.cat.world": "Mundo e clima",
  "rules.cat.spawns": "Spawn de criaturas",
  "rules.cat.engrams": "Engramas",
  "rules.cat.admin": "Administração",
  "rules.cat.custom": "INI personalizado",
  "rules.cat.backups": "Backups",

  "custom.hint":
    "Para chaves que as outras categorias não têm. O launcher só mexe nas linhas criadas aqui e guarda todo o resto do arquivo como está.",
  "custom.count": "{count} chaves",
  "custom.countOne": "1 chave",
  "custom.loadFailed": "Não consegui ler os ini: {reason}",
  "custom.addTitle": "Adicionar chave",
  "custom.editTitle": "Editar chave",
  "custom.file": "ARQUIVO",
  "custom.key": "CHAVE",
  "custom.section": "SEÇÃO",
  "custom.value": "VALOR",
  "custom.add": "ADICIONAR",
  "custom.update": "ATUALIZAR",
  "custom.clear": "LIMPAR",
  "custom.cancelEdit": "CANCELAR EDIÇÃO",
  "custom.outside": "Fora do catálogo.",
  "custom.outsideHint":
    "O launcher não conferiu esta chave no ASE e não valida o valor. Confira o nome com cuidado.",
  "custom.exists":
    "O launcher não conferiu esta chave no ASE. Ela já está no seu {file} com o valor {value}: adicionar troca essa linha quando você salvar.",
  "custom.existsSecret":
    "O launcher não conferiu esta chave no ASE. Ela já está no seu {file} com um valor definido: adicionar troca essa linha quando você salvar.",
  "custom.caption":
    "Chaves personalizadas. Remover só vale quando você salvar.",
  "custom.actions": "Ações",
  "custom.edit": "Editar",
  "custom.editKey": "Editar {key}",
  "custom.removeKey": "Remover {key}",
  "custom.removed": "{key} removida do rascunho.",
  "custom.notInFile": "(não está no arquivo)",
  "custom.empty": "Nenhuma chave personalizada ainda.",
  "custom.note":
    "Chaves que já têm tela, como KillXPMultiplier, não entram aqui: o launcher mostra um atalho para a categoria certa. Opções de linha de comando, como -ForceRespawnDinos, não são do ini e são recusadas. Senhas aparecem só como definida ou não definida.",
  "custom.saveRegion": "Salvar o INI personalizado",
  "custom.openGroup": "Abrir {category}",
  "custom.error.keyRequired": "Informe a chave.",
  "custom.error.cmdline":
    "Isso é uma opção de linha de comando, não uma chave do ini.",
  "custom.error.key":
    "Use só letras, números e _, com um índice opcional como [0]. Sem espaço nem =.",
  "custom.error.managed":
    "Esta chave já tem tela própria em {category}. Mude por lá, para as duas telas não brigarem pela mesma linha.",
  "custom.error.mods": "ActiveMods é da aba MODS. Mude os mods por lá.",
  "custom.error.section":
    "Escolha uma seção entre colchetes, como [ServerSettings].",
  "custom.error.value": "Use até 1024 caracteres, sem quebra de linha.",
  "custom.error.duplicate":
    "Esta chave já está na lista. Use Editar na linha dela.",

  "backups.hint":
    "Antes de cada gravação o launcher copia o Game.ini e o GameUserSettings.ini. Ficam as 10 cópias mais novas. Restaurar reescreve os dois arquivos, e o estado atual vira uma cópia nova antes, então dá para voltar.",
  "backups.count": "{count} cópias",
  "backups.countOne": "1 cópia",
  "backups.loading": "Lendo as cópias…",
  "backups.empty":
    "Nenhuma cópia ainda. O launcher faz uma antes de cada gravação.",
  "backups.caption": "Cópias, da mais nova para a mais antiga.",
  "backups.when": "Quando",
  "backups.files": "Arquivos",
  "backups.action": "Ação",
  "backups.restore": "RESTAURAR BACKUP",
  "backups.restoreRow": "Restaurar backup",
  "backups.restoreOne": "Restaurar backup de {when}",
  "backups.running":
    "O servidor está rodando. Só dá para restaurar com ele parado, porque ele reescreve o ini ao fechar.",
  "backups.confirmTitle": "RESTAURAR BACKUP?",
  "backups.confirmText":
    "O Game.ini e o GameUserSettings.ini voltam a como estavam em {when}. O que foi salvo depois disso sai dos arquivos, mas o estado atual vira uma cópia nova antes, então dá para desfazer restaurando essa cópia.",
  "backups.cancel": "CANCELAR",
  "backups.restored":
    "Backup de {when} restaurado. O estado anterior virou uma cópia nova.",
  "backups.failed": "Não consegui restaurar: {reason}",

  "unit.x": "vezes",
  "unit.s": "segundos",
  "unit.min": "minutos",
  "unit.xp": "XP",
  "unit.uu": "unidades do jogo",
  "unit.count": "itens",

  "opt.MaxPlayers": "Máximo de jogadores",
  "opt.MaxPlayers.info":
    "Quantos jogadores podem estar no servidor ao mesmo tempo.",
  "opt.MaxPlayers.unit": "jogadores",
  "opt.ServerPassword": "Senha para entrar no servidor",
  "opt.ServerPassword.info":
    "Se definida, quem entra no servidor precisa digitar esta senha.",
  "opt.AutoSavePeriodMinutes": "Intervalo do autosave",
  "opt.AutoSavePeriodMinutes.info":
    "De quantos em quantos minutos o mundo é salvo.",
  "opt.DifficultyOffset": "Dificuldade",
  "opt.DifficultyOffset.info":
    "De 0 a 1, ajusta o nível dos dinos selvagens dentro do limite da dificuldade.",
  "opt.OverrideOfficialDifficulty": "Nível dos dinossauros",
  "opt.OverrideOfficialDifficulty.info":
    "Define o nível máximo dos dinos selvagens: 5 dá nível 150. 0 usa o padrão do mapa.",
  "opt.ServerCrosshair": "Mira na tela",
  "opt.ServerCrosshair.info": "Mostra a mira no meio da tela.",
  "opt.ServerForceNoHUD": "Esconder HUD",
  "opt.ServerForceNoHUD.info": "Esconde a interface do jogo para todos.",
  "opt.ShowMapPlayerLocation": "Posição do jogador no mapa",
  "opt.ShowMapPlayerLocation.info": "Mostra no mapa onde o jogador está.",
  "opt.ShowFloatingDamageText": "Números de dano",
  "opt.ShowFloatingDamageText.info":
    "Mostra o dano causado em números flutuantes.",
  "opt.AllowHitMarkers": "Marcadores de acerto",
  "opt.AllowHitMarkers.info":
    "Mostra um marcador quando um ataque à distância acerta.",
  "opt.AllowThirdPersonPlayer": "Terceira pessoa",
  "opt.AllowThirdPersonPlayer.info":
    "Deixa o jogador usar a câmera em terceira pessoa.",
  "opt.globalVoiceChat": "Chat de voz global",
  "opt.globalVoiceChat.info":
    "O chat de voz alcança todos, não só quem está perto.",
  "opt.ProximityChat": "Chat de texto por proximidade",
  "opt.ProximityChat.info": "O chat de texto só chega a quem está perto.",

  "opt.XPMultiplier": "Multiplicador de XP",
  "opt.XPMultiplier.info":
    "Multiplica todo o XP ganho, além dos multiplicadores por atividade.",
  "opt.KillXPMultiplier": "XP por abate",
  "opt.KillXPMultiplier.info":
    "Multiplica o XP ganho ao matar criaturas e jogadores.",
  "opt.HarvestXPMultiplier": "XP por coleta",
  "opt.HarvestXPMultiplier.info": "Multiplica o XP ganho ao coletar recursos.",
  "opt.CraftXPMultiplier": "XP por fabricação",
  "opt.CraftXPMultiplier.info": "Multiplica o XP ganho ao fabricar itens.",
  "opt.GenericXPMultiplier": "XP genérico",
  "opt.GenericXPMultiplier.info":
    "Multiplica o XP que não vem de abate, coleta ou fabricação.",
  "opt.SpecialXPMultiplier": "XP especial",
  "opt.SpecialXPMultiplier.info": "Multiplica o XP de eventos especiais.",
  "opt.OverrideMaxExperiencePointsPlayer": "Limite de XP do jogador",
  "opt.OverrideMaxExperiencePointsPlayer.info":
    "Muda o XP máximo que um jogador pode juntar. 0 mantém o limite do jogo.",
  "opt.OverrideMaxExperiencePointsDino": "Limite de XP dos dinossauros",
  "opt.OverrideMaxExperiencePointsDino.info":
    "Muda o XP máximo que um dinossauro domado pode juntar. 0 mantém o limite do jogo.",

  "opt.HarvestAmountMultiplier": "Quantidade de coleta",
  "opt.HarvestAmountMultiplier.info":
    "Quanto recurso cada golpe de coleta rende.",
  "opt.ResourcesRespawnPeriodMultiplier": "Tempo para os recursos voltarem",
  "opt.ResourcesRespawnPeriodMultiplier.info":
    "Tempo até árvores, pedras e plantas voltarem. Menor é mais rápido.",
  "opt.PlayerHarvestingDamageMultiplier": "Dano de coleta do jogador",
  "opt.PlayerHarvestingDamageMultiplier.info":
    "Quanto dano o jogador causa nos recursos ao coletar.",
  "opt.DinoHarvestingDamageMultiplier": "Dano de coleta dos dinossauros",
  "opt.DinoHarvestingDamageMultiplier.info":
    "Quanto dano os dinossauros causam nos recursos ao coletar.",
  "opt.HarvestHealthMultiplier": "Resistência dos recursos",
  "opt.HarvestHealthMultiplier.info":
    "Quantos golpes uma árvore ou pedra aguenta antes de acabar.",
  "opt.FishingLootQualityMultiplier": "Qualidade da pesca",
  "opt.FishingLootQualityMultiplier.info":
    "Qualidade dos itens tirados da pesca.",
  "opt.SupplyCrateLootQualityMultiplier": "Qualidade dos suprimentos",
  "opt.SupplyCrateLootQualityMultiplier.info":
    "Qualidade dos itens das caixas de suprimento.",
  "opt.CropGrowthSpeedMultiplier": "Crescimento das plantações",
  "opt.CropGrowthSpeedMultiplier.info":
    "Velocidade com que as plantações crescem.",
  "opt.CropDecaySpeedMultiplier": "Apodrecimento das plantações",
  "opt.CropDecaySpeedMultiplier.info":
    "Velocidade com que as plantações apodrecem.",

  "opt.TamingSpeedMultiplier": "Velocidade de doma",
  "opt.TamingSpeedMultiplier.info":
    "Quanto mais alto, mais rápido os dinos são domados.",
  "opt.DinoCountMultiplier": "Quantidade de dinos selvagens",
  "opt.DinoCountMultiplier.info": "Quantos dinos selvagens nascem no mapa.",
  "opt.DinoDamageMultiplier": "Dano dos dinos selvagens",
  "opt.DinoDamageMultiplier.info":
    "Multiplica o dano causado por dinos selvagens.",
  "opt.DinoResistanceMultiplier": "Resistência dos dinos selvagens",
  "opt.DinoResistanceMultiplier.info":
    "Multiplica o dano que dinos selvagens recebem. Menor deixa eles mais resistentes.",
  "opt.TamedDinoDamageMultiplier": "Dano dos dinos domados",
  "opt.TamedDinoDamageMultiplier.info":
    "Multiplica o dano causado por dinos domados.",
  "opt.TamedDinoResistanceMultiplier": "Resistência dos dinos domados",
  "opt.TamedDinoResistanceMultiplier.info":
    "Multiplica o dano que dinos domados recebem. Menor deixa eles mais resistentes.",
  "opt.DinoCharacterFoodDrainMultiplier": "Gasto de comida dos dinos",
  "opt.DinoCharacterFoodDrainMultiplier.info":
    "Velocidade com que os dinos ficam com fome.",
  "opt.DinoCharacterStaminaDrainMultiplier": "Gasto de stamina dos dinos",
  "opt.DinoCharacterStaminaDrainMultiplier.info":
    "Velocidade com que os dinos cansam.",
  "opt.NPCReplacements": "Substituir espécie",
  "opt.NPCReplacements.info":
    "Cada linha troca uma espécie por outra: a da esquerda deixa de nascer e no lugar nasce a da direita. Use o nome da classe, terminado em _C.",
  "opt.NPCReplacements.row": "Regra {n}",
  "opt.NPCReplacements.col.FromClassName": "Espécie que some",
  "opt.NPCReplacements.col.ToClassName": "Espécie que nasce no lugar",
  "opt.DinoSpawnWeightMultipliers": "Frequência de spawn",
  "opt.DinoSpawnWeightMultipliers.info":
    "Muda quanto uma espécie aparece. O nome é o curto do jogo (por exemplo Bronto). O limite, de 0 a 1, é a fração máxima daquela espécie entre os dinos da região.",
  "opt.DinoSpawnWeightMultipliers.row": "Regra {n}",
  "opt.DinoSpawnWeightMultipliers.col.DinoNameTag": "Nome curto da espécie",
  "opt.DinoSpawnWeightMultipliers.col.SpawnWeightMultiplier": "Peso do spawn",
  "opt.DinoSpawnWeightMultipliers.col.OverrideSpawnLimitPercentage":
    "Usar limite próprio",
  "opt.DinoSpawnWeightMultipliers.col.SpawnLimitPercentage": "Limite (0 a 1)",
  "opt.DinoClassDamageMultipliers": "Dano por espécie",
  "opt.DinoClassDamageMultipliers.info":
    "Multiplica o dano de uma espécie selvagem. 1.0 é o normal; 0.5 é metade.",
  "opt.DinoClassDamageMultipliers.row": "Regra {n}",
  "opt.DinoClassDamageMultipliers.col.ClassName": "Espécie",
  "opt.DinoClassDamageMultipliers.col.Multiplier": "Multiplicador de dano",
  "opt.DinoClassResistanceMultipliers": "Resistência por espécie",
  "opt.DinoClassResistanceMultipliers.info":
    "Multiplica a resistência de uma espécie selvagem. Maior que 1.0 faz ela tomar menos dano.",
  "opt.DinoClassResistanceMultipliers.row": "Regra {n}",
  "opt.DinoClassResistanceMultipliers.col.ClassName": "Espécie",
  "opt.DinoClassResistanceMultipliers.col.Multiplier":
    "Multiplicador de resistência",
  "opt.OverrideNamedEngramEntries": "Engramas por nome",
  "opt.OverrideNamedEngramEntries.info":
    "Muda um engrama pelo nome da classe: esconder, custo em pontos, nível mínimo e pré-requisito. Campo vazio fica como o jogo define.",
  "opt.OverrideNamedEngramEntries.row": "Regra {n}",
  "opt.OverrideNamedEngramEntries.col.EngramClassName": "Engrama",
  "opt.OverrideNamedEngramEntries.col.EngramHidden": "Escondido",
  "opt.OverrideNamedEngramEntries.col.EngramPointsCost": "Custo em pontos",
  "opt.OverrideNamedEngramEntries.col.EngramLevelRequirement": "Nível mínimo",
  "opt.OverrideNamedEngramEntries.col.RemoveEngramPreReq": "Sem pré-requisito",
  "opt.OverrideEngramEntries": "Engramas por índice",
  "opt.OverrideEngramEntries.info":
    "Igual a Engramas por nome, mas pelo número do engrama. O número muda entre versões e com mods, então prefira a lista por nome.",
  "opt.OverrideEngramEntries.row": "Regra {n}",
  "opt.OverrideEngramEntries.col.EngramIndex": "Índice do engrama",
  "opt.OverrideEngramEntries.col.EngramHidden": "Escondido",
  "opt.OverrideEngramEntries.col.EngramPointsCost": "Custo em pontos",
  "opt.OverrideEngramEntries.col.EngramLevelRequirement": "Nível mínimo",
  "opt.OverrideEngramEntries.col.RemoveEngramPreReq": "Sem pré-requisito",
  "opt.EngramEntryAutoUnlocks": "Engramas liberados sozinhos",
  "opt.EngramEntryAutoUnlocks.info":
    "O engrama fica aprendido sozinho quando o jogador chega ao nível indicado, sem gastar pontos.",
  "opt.EngramEntryAutoUnlocks.row": "Regra {n}",
  "opt.EngramEntryAutoUnlocks.col.EngramClassName": "Engrama",
  "opt.EngramEntryAutoUnlocks.col.LevelToAutoUnlock": "Nível que libera",
  "opt.OverridePlayerLevelEngramPoints": "Pontos de engrama por nível",
  "opt.OverridePlayerLevelEngramPoints.info":
    "Uma linha por nível do jogador, em ordem: a linha 1 é o nível 1. Diz quantos pontos de engrama o jogador ganha ao chegar naquele nível.",
  "opt.OverridePlayerLevelEngramPoints.row": "Nível {n}",
  "opt.OverridePlayerLevelEngramPoints.col.": "Pontos de engrama",
  "opt.LevelExperienceRampOverrides": "Rampa de experiência",
  "opt.LevelExperienceRampOverrides.info":
    "XP total para cada nível, em ordem, separado por vírgula. Segundo a wiki, a primeira rampa vale para os jogadores e a segunda para os dinossauros.",
  "opt.LevelExperienceRampOverrides.row": "Rampa {n}",
  "opt.LevelExperienceRampOverrides.col.ExperiencePointsForLevel":
    "XP total por nível",
  "opt.ConfigOverrideItemMaxQuantity": "Pilha máxima por item",
  "opt.ConfigOverrideItemMaxQuantity.info":
    "Quantas unidades de um item cabem numa pilha. Ignorar multiplicador faz o valor valer exato, sem o multiplicador de pilha do servidor.",
  "opt.ConfigOverrideItemMaxQuantity.row": "Regra {n}",
  "opt.ConfigOverrideItemMaxQuantity.col.ItemClassString": "Item",
  "opt.ConfigOverrideItemMaxQuantity.col.Quantity.MaxItemQuantity":
    "Pilha máxima",
  "opt.ConfigOverrideItemMaxQuantity.col.Quantity.bIgnoreMultiplier":
    "Ignorar multiplicador",
  "opt.PerLevelStatsMultiplier_DinoWild": "Selvagem, por nível",
  "opt.PerLevelStatsMultiplier_DinoWild.info":
    "Quanto cada nível de um dino selvagem soma ao atributo. Vale para os pontos que ele já nasce tendo.",
  "opt.PerLevelStatsMultiplier_DinoTamed": "Domesticado, por nível",
  "opt.PerLevelStatsMultiplier_DinoTamed.info":
    "Quanto cada ponto que você coloca num dino domesticado soma ao atributo.",
  "opt.PerLevelStatsMultiplier_DinoTamed_Add": "Bônus ao domesticar",
  "opt.PerLevelStatsMultiplier_DinoTamed_Add.info":
    "Bônus fixo que o dino ganha no atributo no momento em que é domesticado.",
  "opt.PerLevelStatsMultiplier_DinoTamed_Affinity": "Bônus pela afinidade",
  "opt.PerLevelStatsMultiplier_DinoTamed_Affinity.info":
    "Bônus que cresce com a efetividade da doma: quanto melhor a doma, maior o ganho.",
  "opt.PerLevelStatsMultiplier_Player": "Jogador, por nível",
  "opt.PerLevelStatsMultiplier_Player.info":
    "Quanto cada ponto que o jogador coloca ao subir de nível soma ao atributo.",
  "opt.DinoCharacterHealthRecoveryMultiplier": "Recuperação de vida dos dinos",
  "opt.DinoCharacterHealthRecoveryMultiplier.info":
    "Velocidade com que os dinos recuperam vida.",
  "opt.PvEDinoDecayPeriodMultiplier": "Tempo de decay dos dinos (PvE)",
  "opt.PvEDinoDecayPeriodMultiplier.info":
    "Tempo até um dino domado abandonado deixar de ser seu no PvE.",
  "opt.AllowRaidDinoFeeding": "Alimentar Titanossauro",
  "opt.AllowRaidDinoFeeding.info":
    "Deixa domar de vez o Titanossauro, alimentando-o.",
  "opt.DinoTurretDamageMultiplier": "Dano das torres em dinossauros",
  "opt.DinoTurretDamageMultiplier.info":
    "Multiplica o dano que torres causam em dinossauros.",

  "opt.PlayerDamageMultiplier": "Dano dos jogadores",
  "opt.PlayerDamageMultiplier.info":
    "Multiplica o dano causado pelos jogadores.",
  "opt.PlayerResistanceMultiplier": "Resistência dos jogadores",
  "opt.PlayerResistanceMultiplier.info":
    "Multiplica o dano que os jogadores recebem. Menor deixa eles mais resistentes.",
  "opt.PlayerCharacterFoodDrainMultiplier": "Gasto de comida do jogador",
  "opt.PlayerCharacterFoodDrainMultiplier.info":
    "Velocidade com que o jogador fica com fome.",
  "opt.PlayerCharacterWaterDrainMultiplier": "Gasto de água do jogador",
  "opt.PlayerCharacterWaterDrainMultiplier.info":
    "Velocidade com que o jogador fica com sede.",
  "opt.PlayerCharacterStaminaDrainMultiplier": "Gasto de stamina do jogador",
  "opt.PlayerCharacterStaminaDrainMultiplier.info":
    "Velocidade com que o jogador cansa.",
  "opt.PlayerCharacterHealthRecoveryMultiplier":
    "Recuperação de vida do jogador",
  "opt.PlayerCharacterHealthRecoveryMultiplier.info":
    "Velocidade com que o jogador recupera vida.",

  "opt.AllowAnyoneBabyImprintCuddle": "Qualquer um cuida do filhote",
  "opt.AllowAnyoneBabyImprintCuddle.info":
    "Qualquer jogador pode cuidar do filhote, não só quem fez o imprint.",
  "opt.EggHatchSpeedMultiplier": "Velocidade de chocar ovos",
  "opt.EggHatchSpeedMultiplier.info":
    "Quanto mais alto, mais rápido o ovo choca.",
  "opt.BabyMatureSpeedMultiplier": "Crescimento dos filhotes",
  "opt.BabyMatureSpeedMultiplier.info":
    "Quanto mais alto, mais rápido o filhote vira adulto.",
  "opt.MatingIntervalMultiplier": "Intervalo entre acasalamentos",
  "opt.MatingIntervalMultiplier.info":
    "Tempo até os dinos poderem acasalar de novo. Menor é mais cedo.",
  "opt.MatingSpeedMultiplier": "Velocidade do acasalamento",
  "opt.MatingSpeedMultiplier.info":
    "Quanto mais alto, mais rápido o acasalamento termina.",
  "opt.LayEggIntervalMultiplier": "Intervalo entre ovos",
  "opt.LayEggIntervalMultiplier.info":
    "Tempo entre um ovo e outro. Maior é mais demorado.",
  "opt.BabyFoodConsumptionSpeedMultiplier": "Comida dos filhotes",
  "opt.BabyFoodConsumptionSpeedMultiplier.info":
    "Velocidade com que os filhotes comem. Menor gasta menos comida.",
  "opt.BabyImprintAmountMultiplier": "Imprint por cuidado",
  "opt.BabyImprintAmountMultiplier.info":
    "Quanto de imprint cada cuidado dá ao filhote.",
  "opt.BabyImprintingStatScaleMultiplier": "Efeito do imprint nos atributos",
  "opt.BabyImprintingStatScaleMultiplier.info":
    "Quanto o imprint melhora os atributos. 0 desliga o efeito.",
  "opt.BabyCuddleIntervalMultiplier": "Intervalo entre cuidados",
  "opt.BabyCuddleIntervalMultiplier.info":
    "De quanto em quanto tempo o filhote pede cuidado.",
  "opt.BabyCuddleGracePeriodMultiplier": "Tolerância para cuidar",
  "opt.BabyCuddleGracePeriodMultiplier.info":
    "Quanto tempo depois do pedido ainda dá para cuidar sem perder imprint.",
  "opt.BabyCuddleLoseImprintQualitySpeedMultiplier":
    "Perda de imprint sem cuidado",
  "opt.BabyCuddleLoseImprintQualitySpeedMultiplier.info":
    "Velocidade com que o imprint cai quando o cuidado atrasa.",

  "opt.GlobalSpoilingTimeMultiplier": "Tempo para estragar",
  "opt.GlobalSpoilingTimeMultiplier.info":
    "Quanto tempo comida e outros perecíveis duram. Maior dura mais.",
  "opt.GlobalItemDecompositionTimeMultiplier": "Tempo dos itens no chão",
  "opt.GlobalItemDecompositionTimeMultiplier.info":
    "Quanto tempo itens e bolsas largados no chão duram.",
  "opt.GlobalCorpseDecompositionTimeMultiplier": "Tempo dos corpos",
  "opt.GlobalCorpseDecompositionTimeMultiplier.info":
    "Quanto tempo corpos de jogadores e criaturas ficam no chão.",
  "opt.PassiveTameIntervalMultiplier": "Intervalo da doma passiva",
  "opt.PassiveTameIntervalMultiplier.info":
    "De quanto em quanto tempo um dino de doma passiva pede comida.",
  "opt.ItemStackSizeMultiplier": "Tamanho das pilhas",
  "opt.ItemStackSizeMultiplier.info":
    "Multiplica quantos itens cabem numa pilha, menos os que não empilham.",
  "opt.ClampItemSpoilingTimes": "Limitar tempo de estragar",
  "opt.ClampItemSpoilingTimes.info":
    "Corta o tempo de estragar de cada item no máximo dele. Pode afetar mods.",
  "opt.ClampItemStats": "Limitar atributos dos itens",
  "opt.ClampItemStats.info": "Liga o limite de atributos dos itens.",

  "opt.StructureDamageMultiplier": "Dano das estruturas",
  "opt.StructureDamageMultiplier.info":
    "Multiplica o dano causado por estruturas, como torres.",
  "opt.StructureResistanceMultiplier": "Resistência das estruturas",
  "opt.StructureResistanceMultiplier.info":
    "Multiplica o dano que estruturas recebem. Menor deixa elas mais resistentes.",
  "opt.PvEStructureDecayPeriodMultiplier":
    "Tempo de decay das estruturas (PvE)",
  "opt.PvEStructureDecayPeriodMultiplier.info":
    "Tempo até uma estrutura abandonada deixar de ser sua no PvE.",
  "opt.AllowCaveBuildingPvE": "Construir em cavernas (PvE)",
  "opt.AllowCaveBuildingPvE.info": "Deixa construir dentro de cavernas no PvE.",
  "opt.AllowCaveBuildingPvP": "Construir em cavernas (PvP)",
  "opt.AllowCaveBuildingPvP.info": "Deixa construir dentro de cavernas no PvP.",
  "opt.DisableStructureDecayPvE": "Desligar decay das estruturas (PvE)",
  "opt.DisableStructureDecayPvE.info":
    "Estruturas abandonadas nunca deixam de ser suas no PvE.",
  "opt.AlwaysAllowStructurePickup": "Sempre pegar estruturas de volta",
  "opt.AlwaysAllowStructurePickup.info":
    "Deixa pegar qualquer estrutura de volta, a qualquer momento.",
  "opt.TheMaxStructuresInRange": "Máximo de estruturas na área",
  "opt.TheMaxStructuresInRange.info":
    "Quantas estruturas podem existir numa mesma área.",
  "opt.TheMaxStructuresInRange.unit": "estruturas",
  "opt.MaxPlatformSaddleStructureLimit": "Máximo de plataformas",
  "opt.MaxPlatformSaddleStructureLimit.info":
    "Quantas selas de plataforma e jangadas podem existir no mapa inteiro.",
  "opt.MaxPlatformSaddleStructureLimit.unit": "plataformas",
  "opt.StructurePickupTimeAfterPlacement": "Tempo para pegar de volta",
  "opt.StructurePickupTimeAfterPlacement.info":
    "Quantos segundos depois de construir ainda dá para pegar a estrutura de volta.",
  "opt.StructurePickupHoldDuration": "Tempo segurando para pegar",
  "opt.StructurePickupHoldDuration.info":
    "Quanto tempo segurar o botão para pegar uma estrutura de volta. 0 é na hora.",
  "opt.bDisableStructurePlacementCollision": "Construir atravessando o terreno",
  "opt.bDisableStructurePlacementCollision.info":
    "Deixa estruturas entrarem no chão e em pedras.",
  "opt.bAllowPlatformSaddleMultiFloors": "Plataforma com vários andares",
  "opt.bAllowPlatformSaddleMultiFloors.info":
    "Deixa construir mais de um andar em selas de plataforma.",
  "opt.FastDecayUnsnappedCoreStructures": "Decay rápido de peças soltas",
  "opt.FastDecayUnsnappedCoreStructures.info":
    "Fundações e pilares soltos somem no prazo do decay rápido.",
  "opt.FastDecayInterval": "Prazo do decay rápido",
  "opt.FastDecayInterval.info":
    "Em quantos segundos as peças soltas somem. Só vale com o decay rápido ligado.",
  "opt.LimitTurretsInRange": "Alcance do limite de torres",
  "opt.LimitTurretsInRange.info": "Raio em que as torres contam para o limite.",
  "opt.LimitTurretsNum": "Limite de torres na área",
  "opt.LimitTurretsNum.info":
    "Quantas torres automáticas cabem dentro do alcance.",
  "opt.LimitTurretsNum.unit": "torres",
  "opt.bLimitTurretsInRange": "Limitar torres por área",
  "opt.bLimitTurretsInRange.info":
    "Desligado, não há limite de torres por área.",

  "opt.serverPVE": "Modo PvE",
  "opt.serverPVE.info":
    "Jogadores não causam dano uns nos outros nem nas coisas dos outros.",
  "opt.ServerHardcore": "Modo hardcore",
  "opt.ServerHardcore.info": "Quem morre volta para o nível 1.",
  "opt.PreventOfflinePvP": "Proteção contra PvP offline",
  "opt.PreventOfflinePvP.info": "Protege a base de quem está desconectado.",
  "opt.PreventOfflinePvPInterval": "Espera da proteção offline",
  "opt.PreventOfflinePvPInterval.info":
    "Segundos até a proteção offline começar depois que a tribo sai.",
  "opt.PreventTribeAlliances": "Bloquear alianças",
  "opt.PreventTribeAlliances.info": "Tribos não podem formar alianças.",
  "opt.EnablePvPGamma": "Gama no PvP",
  "opt.EnablePvPGamma.info": "Deixa mudar o brilho (gama) no PvP.",
  "opt.DisablePvEGamma": "Bloquear gama no PvE",
  "opt.DisablePvEGamma.info": "Impede mudar o brilho (gama) no PvE.",
  "opt.AllowFlyerCarryPVE": "Voadores carregam selvagens no PvE",
  "opt.AllowFlyerCarryPVE.info":
    "Voadores podem pegar criaturas selvagens no PvE.",
  "opt.DisableDinoDecayPvE": "Desligar decay dos dinos (PvE)",
  "opt.DisableDinoDecayPvE.info":
    "Dinos domados abandonados nunca deixam de ser seus no PvE.",
  "opt.bDisableFriendlyFire": "Sem fogo amigo",
  "opt.bDisableFriendlyFire.info":
    "Membros da mesma tribo não se ferem, nem ferem os dinos e estruturas da tribo.",
  "opt.bPvEDisableFriendlyFire": "Sem fogo amigo no PvE",
  "opt.bPvEDisableFriendlyFire.info":
    "O mesmo que Sem fogo amigo, mas só no PvE.",
  "opt.bAutoPvETimer": "PvE em horário",
  "opt.bAutoPvETimer.info":
    "Liga o PvE só entre o início e o fim definidos abaixo.",
  "opt.bAutoPvEUseSystemTime": "Usar o relógio do PC",
  "opt.bAutoPvEUseSystemTime.info":
    "O horário do PvE segue o relógio do PC, não o do jogo.",
  "opt.AutoPvEStartTimeSeconds": "Início do PvE",
  "opt.AutoPvEStartTimeSeconds.info":
    "Segundo do dia em que o PvE começa, de 0 a 86400.",
  "opt.AutoPvEStopTimeSeconds": "Fim do PvE",
  "opt.AutoPvEStopTimeSeconds.info":
    "Segundo do dia em que o PvE termina, de 0 a 86400.",

  "opt.DayCycleSpeedScale": "Velocidade do ciclo dia e noite",
  "opt.DayCycleSpeedScale.info": "Velocidade com que o dia inteiro passa.",
  "opt.DayTimeSpeedScale": "Velocidade do dia",
  "opt.DayTimeSpeedScale.info": "Velocidade só da parte do dia.",
  "opt.NightTimeSpeedScale": "Velocidade da noite",
  "opt.NightTimeSpeedScale.info": "Velocidade só da parte da noite.",
  "opt.DisableWeatherFog": "Desligar neblina",
  "opt.DisableWeatherFog.info": "O clima não forma neblina.",
  "opt.PreventDiseases": "Desligar doenças",
  "opt.PreventDiseases.info": "Ninguém pega doenças.",
  "opt.NonPermanentDiseases": "Doenças temporárias",
  "opt.NonPermanentDiseases.info": "As doenças passam ao morrer.",
  "opt.UseCorpseLifeSpanMultiplier": "Duração de corpos e caixas",
  "opt.UseCorpseLifeSpanMultiplier.info":
    "Quanto tempo corpos e caixas largadas duram.",
  "opt.RandomSupplyCratePoints": "Suprimentos em lugares aleatórios",
  "opt.RandomSupplyCratePoints.info":
    "As caixas de suprimento caem em lugares aleatórios. Em Ragnarok pode deixar artefatos inacessíveis.",
  "opt.ForceAllowCaveFlyers": "Voadores em cavernas",
  "opt.ForceAllowCaveFlyers.info": "Deixa voadores entrarem em cavernas.",
  "opt.PreventSpawnAnimations": "Nascer sem animação",
  "opt.PreventSpawnAnimations.info":
    "O jogador nasce sem a animação de acordar.",

  "opt.AdminLogging": "Registrar comandos de admin",
  "opt.AdminLogging.info": "Grava no log os comandos de admin usados.",
  "opt.RCONEnabled": "RCON ligado",
  "opt.RCONEnabled.info":
    "Liga o RCON. O launcher usa o RCON nos botões Salvar jogo e Regerar selvagens.",
  "opt.RCONPort": "Porta do RCON",
  "opt.RCONPort.info": "Porta TCP do RCON. Não abra esta porta no roteador.",
  "opt.ServerAdminPassword": "Senha de admin no ini (jogo e RCON)",
  "opt.ServerAdminPassword.info":
    "Senha do console de admin do jogo e do RCON. É outra que a senha guardada no Windows na aba LAUNCHER.",
  "opt.ServerAutoForceRespawnWildDinosInterval":
    "Renascer dinos selvagens a cada",
  "opt.ServerAutoForceRespawnWildDinosInterval.info":
    "Ao reiniciar, faz os dinos selvagens renascerem se passou esse tempo. 0 desliga.",
} as const;
