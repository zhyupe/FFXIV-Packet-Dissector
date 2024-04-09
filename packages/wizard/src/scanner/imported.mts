import {
  BitConverter,
  Encoding,
  IncludesBytes,
  Offsets,
  PacketSource,
  Vector3,
  hex,
  int,
} from './helper.mjs'
import { Scanner } from './scanner.mjs'

interface ImportedPacket {
  PacketSize: number
  Data: Buffer
  SourceActor: number
  TargetActor: number
}

const bigIntZero = BigInt(0)
const emptyHeader = Buffer.alloc(Offsets.IpcData)

export const getImportedScanners = () => {
  const scanners: Scanner[] = []
  const RegisterScanner = (
    name: string,
    tutorial: string,
    source: PacketSource,
    handler: (
      packet: ImportedPacket,
      answer: string[],
      options: { Text: string },
    ) => boolean,
    prompts: string[] = [],
  ) => {
    scanners.push({
      name,
      instruction: tutorial,
      source,
      prompt: prompts.map((message) => ({
        type: 'input',
        name: 'a',
        message,
      })),
      handler: (packet, answer) => {
        const store = { Text: '' }
        const result = handler(
          {
            PacketSize: packet.data.length + Offsets.IpcData,
            Data: Buffer.concat([emptyHeader, packet.data]),
            SourceActor: packet.header.sourceActor,
            TargetActor: packet.header.targetActor,
          },
          [answer.a],
          store,
        )

        if (result) {
          if (store.Text) return store.Text
          return true
        }

        return false
      },
    })
    //
  }

  //=================
  RegisterScanner(
    'PlayerSetup',
    'Please log in.',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize > 300 &&
      IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(parameters[0])),
    ['Please enter your character name:'],
  )

  //=================
  var maxHp = 0
  RegisterScanner(
    'UpdateHpMpTp',
    'Please alter your HP or MP and allow your stats to regenerate completely.',
    PacketSource.Server,
    (packet, parameters) => {
      maxHp = int.Parse(parameters[0])

      if (packet.PacketSize != 40 && packet.PacketSize != 48) return false

      var packetHp = BitConverter.ToUInt32(packet.Data, Offsets.IpcData)
      var packetMp = BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 4)

      return packetHp == maxHp && packetMp == 10000
    },
    ['Please enter your max HP:'],
  )
  //=================
  RegisterScanner(
    'UpdateClassInfo',
    'Switch to the job you entered level for.',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 48 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 4) ==
        int.Parse(parameters[0]),
    ['Please enter your the level for another job:'],
  )
  //=================
  RegisterScanner(
    'PlayerStats',
    'Switch back to the job you entered HP for.',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 176 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 24) == maxHp &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 28) == 10000 && // MP equals 10000
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 36) == 10000,
  ) // GP equals 10000
  //=================
  RegisterScanner(
    'UpdatePositionHandler',
    'Please move your character.',
    PacketSource.Client,
    (packet, _) =>
      packet.PacketSize == 56 &&
      packet.SourceActor == packet.TargetActor &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 4) == 0 &&
      BitConverter.ToUInt64(packet.Data, Offsets.IpcData + 8) != bigIntZero &&
      BitConverter.ToUInt32(packet.Data, packet.Data.length - 4) == 0,
  )
  //=================
  RegisterScanner(
    'ClientTrigger',
    'Please draw your weapon.',
    PacketSource.Client,
    (packet, _) =>
      packet.PacketSize == 64 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData) == 1,
  )
  RegisterScanner(
    'ActorControl',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 56 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 4) == 1,
  )
  //=================
  RegisterScanner(
    'ActorControlSelf',
    'Please enter sanctuary and wait for rested bonus gains.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 64 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData) == 24 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 4) <= 604800 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8) == 0 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 12) == 0 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 16) == 0 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 20) == 0 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 24) == 0,
  )
  //=================
  RegisterScanner(
    'ActorControlTarget',
    'Please mark yourself with the "1" marker.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 64 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x04) == 0 &&
      packet.SourceActor == packet.TargetActor &&
      packet.SourceActor ==
        BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x08) &&
      packet.SourceActor ==
        BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x18),
  )
  //=================
  RegisterScanner(
    'ChatHandler',
    'Please /say your message in-game:',
    PacketSource.Client,
    (packet, parameters) =>
      IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(parameters[0])),
    ['Please enter a message to /say in-game:'],
  )
  //=================
  RegisterScanner(
    'Playtime',
    'Please type /playtime.',
    PacketSource.Server,
    (packet, parameters) => {
      if (packet.PacketSize != 40 || packet.SourceActor != packet.TargetActor)
        return false

      var playtime = BitConverter.ToUInt32(packet.Data, Offsets.IpcData)

      var inputDays = int.Parse(parameters[0])
      var packetDays = Math.floor(playtime / 60 / 24)

      // In case you played for 23:59:59
      return inputDays == packetDays || inputDays + 1 == packetDays
    },
    ['Type /playtime, and input the days you played:'],
  )
  //=================
  let searchBytes: Buffer
  RegisterScanner(
    'SetSearchInfoHandler',
    'Please set that search comment in-game.',
    PacketSource.Client,
    (packet, parameters) => {
      searchBytes ??= Encoding.UTF8.GetBytes(parameters[0])
      return IncludesBytes(packet.Data, searchBytes)
    },
    [
      'Please enter a somewhat lengthy search message here, before entering it in-game:',
    ],
  )
  RegisterScanner('UpdateSearchInfo', '', PacketSource.Server, (packet, _) =>
    IncludesBytes(packet.Data, searchBytes),
  )
  RegisterScanner(
    'ExamineSearchInfo',
    'Open your search information with the "View Search Info" button.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize > 232 && IncludesBytes(packet.Data, searchBytes),
  )
  //=================
  RegisterScanner(
    'Examine',
    "Please examine that character's equipment.",
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize > 600 &&
      IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(parameters[0])),
    ["Please enter a nearby character's name:"],
  )
  //=================
  var lightningCrystals = -1
  RegisterScanner(
    'ActorCast',
    'Please teleport to Limsa Lominsa Lower Decks.',
    PacketSource.Server,
    (packet, parameters) => {
      if (lightningCrystals == -1) lightningCrystals = int.Parse(parameters[0])
      return (
        packet.PacketSize == 64 &&
        BitConverter.ToUInt16(packet.Data, Offsets.IpcData) == 5
      )
    },
    ['Please enter the number of Lightning Crystals you have:'],
  )
  RegisterScanner(
    'CurrencyCrystalInfo',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 56 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 4) == 2001 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 6) == 10 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8) ==
        lightningCrystals &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 16) == 12,
  )
  RegisterScanner(
    'InitZone',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 136 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 2) == 129,
  )
  const limsaLominsaWeathers = [3, 1, 2, 4, 7]
  RegisterScanner(
    'WeatherChange',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 40 &&
      limsaLominsaWeathers.includes(packet.Data[Offsets.IpcData]) &&
      BitConverter.ToSingle(packet.Data, Offsets.IpcData + 4) == 20.0,
  )
  //=================
  var actorMoveCenter = new Vector3(-85, 19, 0)
  var inRange = (diff: Vector3, range: Vector3) => {
    return (
      Math.abs(diff.X) < range.X &&
      Math.abs(diff.Y) < range.Y &&
      Math.abs(diff.Z) < range.Z
    )
  }
  RegisterScanner(
    'ActorMove',
    "Please wait. (Teleport to Limsa Lominsa Lower Decks if you haven't)",
    PacketSource.Server,
    (packet, _) => {
      if (packet.PacketSize != 48) return false

      var x =
        (BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 6) / 65536) *
          2000 -
        1000
      var y =
        (BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 8) / 65536) *
          2000 -
        1000
      var z =
        (BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 10) / 65536) *
          2000 -
        1000

      return inRange(
        new Vector3(x, y, z).minus(actorMoveCenter),
        new Vector3(15, 2, 15),
      )
    },
  )
  //=================
  RegisterScanner(
    'PlayerSpawn',
    'Please wait for another player to spawn in your vicinity.',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize > 500 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 4) ==
        int.Parse(parameters[0]),
    ['Please enter your world ID:'],
  )
  /* Commented for now because this also matches UpdateTpHpMp
            RegisterScanner("ActorFreeSpawn", '',
                PacketSource.Server,
                (packet, _) => packet.PacketSize == 40 &&
                               packet.SourceActor == packet.TargetActor);
            */
  //=================
  RegisterScanner(
    'ActorSetPos',
    'Please wait, this may take some time. You can also teleport to another Aethernet Shard in the same map and then teleport back.',
    PacketSource.Server,
    (packet, _) => {
      if (packet.PacketSize != 56) return false

      var x = BitConverter.ToSingle(packet.Data, Offsets.IpcData + 8)
      var y = BitConverter.ToSingle(packet.Data, Offsets.IpcData + 12)
      var z = BitConverter.ToSingle(packet.Data, Offsets.IpcData + 16)

      return inRange(
        new Vector3(x, y, z).minus(actorMoveCenter),
        new Vector3(15, 2, 15),
      )
    },
  )
  //=================
  RegisterScanner(
    'HousingWardInfo',
    'Please view a housing ward from a city aetheryte/ferry.',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 2448 &&
      IncludesBytes(
        packet.Data.subarray(Offsets.IpcData + 16, Offsets.IpcData + 16 + 32),
        Encoding.UTF8.GetBytes(parameters[0]),
      ),
    [
      "Please enter the name of whoever owns the first house in the ward (if it's an FC, their shortname):",
    ],
  )
  //=================
  RegisterScanner(
    'PrepareZoning',
    "Please teleport to The Aftcastle (Adventurers' Guild in Limsa Lominsa Upper Decks).",
    PacketSource.Server,
    (packet, _) => {
      if (packet.PacketSize != 48) return false

      var logMessage = BitConverter.ToUInt32(packet.Data, Offsets.IpcData)
      var targetZone = BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 4)
      var animation = BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 6)
      var fadeOutTime = packet.Data[Offsets.IpcData + 10]

      return (
        logMessage == 0 &&
        targetZone == 128 &&
        animation == 112 &&
        fadeOutTime == 15 &&
        packet.SourceActor == packet.TargetActor
      )
    },
  )
  //=================
  RegisterScanner(
    'ContainerInfo',
    'Please wait.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8) == 2001,
  )
  RegisterScanner(
    'ItemInfo',
    'Please open your chocobo saddlebag.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 96 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 8) == 4000,
  )
  //=================
  RegisterScanner(
    'PlaceFieldMarker',
    'Please target The Aftcastle Aethernet Shard and type /waymark A <t>',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      packet.SourceActor == packet.TargetActor &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData) == 0x0100 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x04) == 0x3edc &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x08) == 0x9c70,
  )
  //=================
  RegisterScanner(
    'PlaceFieldMarkerPreset',
    'Please type /waymark clear',
    PacketSource.Server,
    (packet, _) => {
      if (packet.PacketSize != 136 || packet.SourceActor != packet.TargetActor)
        return false

      for (var i = 0; i < 24; i++) {
        if (
          BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x04 + 4 * i) !=
          0
        )
          return false
      }

      return true
    },
  )
  //=================
  RegisterScanner(
    'EffectResult',
    'Switch to Fisher and enable snagging.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 128 &&
      packet.SourceActor == packet.TargetActor &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8) ==
        packet.SourceActor &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 12) ==
        BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 16) &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 0x1e) == 761,
  )
  //=================
  RegisterScanner(
    'EventStart',
    'Please begin fishing and put your rod away immediately.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 56 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8) == 0x150001,
  )
  RegisterScanner(
    'EventPlay',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 72 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8) == 0x150001,
  )
  RegisterScanner(
    'EventFinish',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData) == 0x150001 &&
      packet.Data[Offsets.IpcData + 4] == 0x14 &&
      packet.Data[Offsets.IpcData + 5] == 0x01,
  )
  //=================
  RegisterScanner(
    'EventPlay4',
    'Please cast your line and catch a fish at Limsa Lominsa.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 80 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x1c) == 284,
  )
  //=================
  const limsaLominsaFishes = [4869, 4870, 4776, 4871, 4872, 4874, 4876]
  const desynthResult = [5267, 5823]
  RegisterScanner(
    'DesynthResult',
    'Please desynth the fish (You can also purchase a Merlthor Goby, Lominsan Anchovy or Harbor Herring from marketboard). If you got items other than Fine Sand and Allagan Tin Piece, please desynth again.',
    PacketSource.Server,
    (packet, _) =>
      (packet.PacketSize == 104 || packet.PacketSize == 136) &&
      limsaLominsaFishes.includes(
        BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x08) % 1000000,
      ) &&
      desynthResult.includes(
        BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x0c) % 1000000,
      ),
  )
  //=================
  let fcRank = 0
  RegisterScanner(
    'FreeCompanyInfo',
    'Load a zone. (If you are running scanners by order, suggest teleporting to Aetheryte Plaza)',
    PacketSource.Server,
    (packet, parameters) => {
      fcRank = int.Parse(parameters[0])
      return (
        packet.PacketSize == 112 && packet.Data[Offsets.IpcData + 45] == fcRank
      )
    },
    ['Please enter your Free Company rank:'],
  )
  RegisterScanner(
    'FreeCompanyDialog',
    'Open your Free Company window (press G or ;)',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 112 && packet.Data[Offsets.IpcData + 0x31] == fcRank,
  )
  //=================
  const darkMatter = [5594, 5595, 5596, 5597, 5598, 10386, 17837, 33916]
  var isDarkMatter = (itemId: number) => darkMatter.includes(itemId)

  RegisterScanner(
    'MarketBoardSearchResult',
    'Please click "Catalysts" on the market board.',
    PacketSource.Server,
    (packet, _) => {
      if (packet.PacketSize != 208) return false

      for (var i = 0; i < 22; ++i) {
        var itemId = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8 * i)
        if (itemId == 0) {
          break
        }

        if (itemId == darkMatter[6]) {
          return true
        }
      }

      return false
    },
  )
  RegisterScanner(
    'MarketBoardItemListingCount',
    'Please open the market board listings for any Dark Matter.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      isDarkMatter(BitConverter.ToUInt32(packet.Data, Offsets.IpcData)),
  )
  RegisterScanner(
    'MarketBoardItemListingHistory',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 1080 &&
      isDarkMatter(BitConverter.ToUInt32(packet.Data, Offsets.IpcData)),
  )
  RegisterScanner(
    'MarketBoardItemListing',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize > 1552 &&
      isDarkMatter(BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 44)),
  )
  RegisterScanner(
    'MarketBoardPurchaseHandler',
    'Please purchase any Dark Matter',
    PacketSource.Client,
    (packet, _) =>
      packet.PacketSize == 72 &&
      isDarkMatter(BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x10)),
  )
  RegisterScanner(
    'MarketBoardPurchase',
    '',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      isDarkMatter(BitConverter.ToUInt32(packet.Data, Offsets.IpcData)),
  )
  //=================
  const scannerItemId = 4850 // Honey
  RegisterScanner(
    'UpdateInventorySlot',
    'Please purchase a Honey from Tradecraft Supplier (2 gil).',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 96 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x10) ==
        scannerItemId,
  )
  //=================
  let inventoryModifyHandlerId = 0
  RegisterScanner(
    'InventoryModifyHandler',
    'Please drop the Honey.',
    PacketSource.Client,
    (packet, _, comment) => {
      var match =
        packet.PacketSize == 80 &&
        BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 0x18) ==
          scannerItemId
      if (!match) return false

      inventoryModifyHandlerId = BitConverter.ToUInt32(
        packet.Data,
        Offsets.IpcData,
      )

      var baseOffset = BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 4)
      comment.Text = `Base offset: ${hex(baseOffset)}`
      return true
    },
  )
  RegisterScanner(
    'InventoryActionAck',
    'Please wait.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData) ==
        inventoryModifyHandlerId,
  )
  RegisterScanner(
    'InventoryTransaction',
    'Please wait.',
    PacketSource.Server,
    (packet, _) => {
      var match =
        packet.PacketSize == 80 &&
        BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 0x18) ==
          scannerItemId
      if (!match) return false

      inventoryModifyHandlerId = BitConverter.ToUInt32(
        packet.Data,
        Offsets.IpcData,
      )
      return true
    },
  )
  RegisterScanner(
    'InventoryTransactionFinish',
    'Please wait.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData) ==
        inventoryModifyHandlerId,
  )
  //=================
  RegisterScanner(
    'ResultDialog',
    'Please visit a retainer counter and request information about market tax rates.',
    PacketSource.Server,
    (packet, _) => {
      if (packet.PacketSize != 72) return false

      var rate1 = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8)
      var rate2 = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 12)
      var rate3 = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 16)
      var rate4 = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 20)

      return rate1 <= 7 && rate2 <= 7 && rate3 <= 7 && rate4 <= 7
    },
  )
  //=================
  let retainerBytes: Buffer
  RegisterScanner(
    'RetainerInformation',
    'Please use the Summoning Bell.',
    PacketSource.Server,
    (packet, parameters) => {
      retainerBytes ??= Encoding.UTF8.GetBytes(parameters[0])
      return (
        packet.PacketSize == 112 &&
        IncludesBytes(packet.Data.subarray(73, 73 + 32), retainerBytes)
      )
    },
    ["Please enter one of your retainers' names:"],
  )
  //=================
  RegisterScanner(
    'NpcSpawn',
    'Please summon that retainer.',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize > 624 &&
      IncludesBytes(packet.Data.subarray(588, 588 + 36), retainerBytes),
  )
  //================
  RegisterScanner(
    'ItemMarketBoardInfo',
    'Please put any item on sale for a unit price of 123456 and summon the retainer again',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 64 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 0x10) == 123456,
  )
  //=================
  RegisterScanner(
    'ObjectSpawn',
    'Please enter a furnished house.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 96 &&
      packet.Data[Offsets.IpcData + 1] == 12 &&
      packet.Data[Offsets.IpcData + 2] == 4 &&
      packet.Data[Offsets.IpcData + 3] == 0 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 12) == 0,
  )
  //=================
  const basicSynthesis = [
    100001, 100015, 100030, 100045, 100060, 100075, 100090, 100105,
  ]
  RegisterScanner(
    'EventPlay32',
    'Use Trial Synthesis from any recipes, and use Basic Synthesis',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 320 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData) ==
        packet.SourceActor &&
      basicSynthesis.includes(
        BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 44),
      ),
  )
  //=================
  RegisterScanner(
    'EffectResultBasic',
    'Switch to White Mage, and auto attack on an enemy.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 56 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 8) ==
        packet.SourceActor,
  )
  //=================
  RegisterScanner(
    'Effect',
    'Cast Dia on an enemy. Then wait for a damage tick.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 156 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 8) == 16532,
  )
  //=================
  RegisterScanner(
    'StatusEffectList',
    'Please wait...',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 416 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 20) == 1871,
  )
  //=================
  RegisterScanner(
    'ActorGauge',
    'Wait for gauge changes, then clear the lilies.',
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 48 &&
      packet.Data[Offsets.IpcData] == 24 &&
      packet.Data[Offsets.IpcData + 5] == 0 &&
      packet.Data[Offsets.IpcData + 6] > 0,
  )
  //=================
  RegisterScanner(
    'CFPreferredRole',
    'Please wait, this may take some time...',
    PacketSource.Server,
    (packet, _) => {
      if (packet.PacketSize != 48) return false

      var allInRange = true

      for (var i = 1; i < 10; i++)
        if (
          packet.Data[Offsets.IpcData + i] > 4 ||
          packet.Data[Offsets.IpcData + i] < 1
        )
          allInRange = false

      return allInRange
    },
  )
  //=================
  RegisterScanner(
    'CFNotify',
    'Please enter the "Sastasha" as an undersized party.', // CFNotifyPop
    PacketSource.Server,
    (packet, _) =>
      packet.PacketSize == 72 &&
      BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 28) == 4,
  )
  //=================
  RegisterScanner(
    'UpdatePositionInstance',
    'Please move your character in an/the instance.',
    PacketSource.Client,
    (packet, _) =>
      packet.PacketSize == 72 &&
      packet.SourceActor == packet.TargetActor &&
      BitConverter.ToUInt64(packet.Data, Offsets.IpcData) != bigIntZero &&
      BitConverter.ToUInt64(packet.Data, Offsets.IpcData + 0x08) !=
        bigIntZero &&
      BitConverter.ToUInt64(packet.Data, Offsets.IpcData + 0x10) !=
        bigIntZero &&
      BitConverter.ToUInt64(packet.Data, Offsets.IpcData + 0x18) !=
        bigIntZero &&
      BitConverter.ToUInt32(packet.Data, packet.Data.length - 4) == 0,
  )
  //=================
  const whmHoly = [139, 25860]
  var isHolyPacket = (packet: any, packetSize: number) =>
    packet.PacketSize == packetSize &&
    whmHoly.includes(BitConverter.ToUInt16(packet.Data, Offsets.IpcData + 8))

  RegisterScanner(
    'AoeEffect8',
    'Attack multiple enemies with Holy.',
    PacketSource.Server,
    (packet, _) => isHolyPacket(packet, 668),
  )
  //=================
  RegisterScanner(
    'AoeEffect16',
    'Attack multiple enemies (>8) with Holy.',
    PacketSource.Server,
    (packet, _) => isHolyPacket(packet, 1244),
  )
  //=================
  RegisterScanner(
    'AoeEffect24',
    'Attack multiple enemies (>16) with Holy.',
    PacketSource.Server,
    (packet, _) => isHolyPacket(packet, 1820),
  )
  //=================
  RegisterScanner(
    'AoeEffect32',
    'Attack multiple enemies (>24) with Holy.',
    PacketSource.Server,
    (packet, _) => isHolyPacket(packet, 2396),
  )
  //=================
  RegisterScanner(
    'SystemLogMessage',
    'Please go to first boss room and touch any coral formation.',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 56 &&
      [2034, 2035].includes(
        BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 4),
      ),
  )
  //=================
  let airshipName: string
  let submarineName: string

  RegisterScanner(
    'AirshipTimers',
    'Open your Estate tab from the Timers window if you have any airships on exploration.',
    PacketSource.Server,
    (packet, parameters) => {
      airshipName = parameters[0]
      return (
        packet.PacketSize == 176 &&
        IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(airshipName))
      )
    },
    ['Please enter your airship name:'],
  )
  RegisterScanner(
    'SubmarineTimers',
    'Open your Estate tab from the Timers window if you have any submarines on exploration.',
    PacketSource.Server,
    (packet, parameters) => {
      submarineName = parameters[0]
      return (
        packet.PacketSize == 176 &&
        IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(submarineName))
      )
    },
    ['Please enter your submarine name:'],
  )
  RegisterScanner(
    'AirshipStatusList',
    'Open your airship management console if you have any airships',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 192 &&
      IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(airshipName)),
  )
  RegisterScanner(
    'AirshipStatus',
    'Check the status of a specific airship if you have any airships',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 104 &&
      IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(airshipName)),
  )
  RegisterScanner(
    'AirshipExplorationResult',
    'Open a voyage log from an airship',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 320 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 4) ==
        int.Parse(parameters[0]),
    [
      'Please enter the experience from the first sector (first destination in log, not the ones next to report rank and items):',
    ],
  )
  RegisterScanner(
    'SubmarineProgressionStatus',
    'Open your submarine management console if you have any submarines',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 64 &&
      packet.Data[Offsets.IpcData] >= 1 &&
      packet.Data[Offsets.IpcData] <= 4,
  )
  RegisterScanner(
    'SubmarineStatusList',
    'Open your submarine management console if you have any submarines',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 272 &&
      IncludesBytes(packet.Data, Encoding.UTF8.GetBytes('黑塔')),
  )
  RegisterScanner(
    'SubmarineExplorationResult',
    'Open a voyage log from a submarine',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 320 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 16) ==
        int.Parse(parameters[0]),
    [
      'Please enter the experience from the first sector (first destination in log, not the ones next to report rank and items):',
    ],
  )
  //=================
  RegisterScanner(
    'IslandWorkshopSupplyDemand',
    'Go to your Island Sanctuary and check workshop supply/demand status',
    PacketSource.Server,
    (packet, parameters) =>
      packet.PacketSize == 116 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData) == 0 &&
      BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 1) == 0,
  )
  RegisterScanner(
    'MiniCactpotInit',
    'Start playing Mini Cactpot.',
    PacketSource.Server,
    (packet, _) => {
      if (packet.Data.length != Offsets.IpcData + 136) return false

      var indexEnd = packet.Data[Offsets.IpcData + 7]
      var column = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 12)
      var row = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 16)
      var digit = BitConverter.ToUInt32(packet.Data, Offsets.IpcData + 20)

      return indexEnd == 23 && column <= 2 && row <= 2 && digit <= 9
    },
  )
  //=================
  RegisterScanner(
    'SocialList',
    'Open your Party List.',
    PacketSource.Server,
    (packet, parameters) => {
      if (packet.Data.length != Offsets.IpcData + 896) return false
      if (packet.Data[Offsets.IpcData + 13 - 1] != 1) return false
      if (!IncludesBytes(packet.Data, Encoding.UTF8.GetBytes(parameters[0])))
        return false
      return true
    },
    ['Please enter your character name:'],
  )

  return scanners
}
