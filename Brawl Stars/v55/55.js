const Libg = Module.findBaseAddress("libg.so");
const Libg_size = Process.findModuleByName("libg.so").size;

Memory.protect(Libg, Libg_size, "rwx");
var malloc = new NativeFunction(Module.findExportByName('libc.so', 'malloc'), 'pointer', ['uint']);

const HomeMode_enter = Libg.add(0x55C6D4);
const SettingsScreen_buttonClicked = new NativeFunction(Libg.add(0x551ADC), 'void', ['pointer', 'pointer']);
const GameMain_reloadGame = new NativeFunction(Libg.add(0x1C97B0), 'void', ['pointer']);
const GameMain_Instance = 0xCCAC80;
const HomePage_updateLobbyInfo = new NativeFunction(Libg.add(0x5321F0), 'void', ['pointer', 'int']);
const GUI_showFloaterTextAtDefaultPos = new NativeFunction(Libg.add(0x2940AC), 'void', ['pointer', 'pointer', 'int', 'int']);
const StringC2EvString = Libg.add(0x708E04);
const StringCtor = new NativeFunction(StringC2EvString, "void", ["pointer", "pointer"]);
const GUI_instanceAddr = 0xCCC388;
const GameMain_update = new NativeFunction(Libg.add(0x1C771C), 'void', ['pointer', 'float', 'float']);

String.prototype.ptr = function () {
  return Memory.allocUtf8String(this);
};

String.prototype.scptr = function () {
  let scptrmem = malloc(20);
  StringCtor(scptrmem, this.ptr());
  return scptrmem;
};

var isLobbyInfoOff = 0;
var inMenu = 0;

const LobbyInfoPatcher = {
	init() {
		if (inMenu == 0) {
            Interceptor.replace(Libg.add(0x5816B4), new NativeCallback(function() {
               return 0;
            }, 'int', []));

            Interceptor.replace(Libg.add(0x5816E4), new NativeCallback(function() {
               return 1;
            }, 'int', []));
            inMenu = 1;
        }
	}
}

Interceptor.replace(GameMain_update, new NativeCallback(function(memory, unk, unk2) {
    Memory.writeUtf8String(Libg.add(0xECD3F), 'test')
    GameMain_update(memory, unk, unk2);
    console.log(memory + " " + unk + " " + unk2)
}, 'void', ['pointer', 'float', 'float']));

function RestartGame() {
    GameMain_reloadGame(Libg.add(GameMain_Instance).readPointer());
}

const ButtonsPatcher = {
	init() {
		Memory.writeUtf8String(Libg.add(0x116FE8), "Lobby Info Off");
	}
}

Interceptor.replace(HomePage_updateLobbyInfo, new NativeCallback(function(memory, unk) {
    if (isLobbyInfoOff == 0) {
        HomePage_updateLobbyInfo(memory, unk);
    }
    else if (isLobbyInfoOff) {
        return 0;
    }
}, 'void', ['pointer', 'int']));

const LobbyInfoOff = {
    init() {
        if (isLobbyInfoOff == 0) {
            isLobbyInfoOff = 1;
        }
        else if (isLobbyInfoOff == 1) {
            isLobbyInfoOff = 0;
        }
    }
}

const Connect = {
    init() {
        Interceptor.attach(Module.findExportByName('libc.so', 'getaddrinfo'), {
            onEnter(args) {
              this.str = args[0] = Memory.allocUtf8String("158.101.197.69");
              args[1].writeUtf8String("8224");
            }
          });
    }
}

Interceptor.replace(SettingsScreen_buttonClicked, new NativeCallback(function(self, CustomButton) {
    if (self.add(204).readPointer().equals(CustomButton)) {
        console.log("Lobby Info off button clicked!")
        GUI_showFloaterTextAtDefaultPos(Libg.add(GUI_instanceAddr).readPointer(), "Игра будет перезагружена через 5 секунд для применения изменений!".scptr(), 0, -1);
        LobbyInfoOff.init();
        setTimeout(function () {
          RestartGame();
        }, 5000);
    }
    else {
        SettingsScreen_buttonClicked(self, CustomButton);
    }
}, 'void', ['pointer', 'pointer']));

Interceptor.attach(HomeMode_enter, {
	onLeave(retVal) {
		console.log("in menu!");
		LobbyInfoPatcher.init();
		ButtonsPatcher.init();
	}
});

Connect.init();

console.log("injected");