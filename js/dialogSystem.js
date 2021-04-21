class DialogList {
    name;
    dialogList = [];
    otherObject = null;

    constructor(name) {
        this.name = name;
    }

    fromOtherObject(otherObject) {
        this.otherObject = otherObject;
        return this;
    }

    addOption(text, action = null, selected = false) {
        this.dialogList.push({text:text, action:action, selected:selected});
        return this;
    }

    callAction(index, param) {
        return this?.dialogList?.[index]?.action(param);
    }

    actionExists(index) {
        return !!this.dialogList[index].action;
    }

    getDialogList() {
        if(this.otherObject) {
            this.dialogList = [];
            this.addOption('back', x => x.back());
            for(let i = 0; i < this.otherObject.length; i++) {
                if(this.otherObject[i] !== null) {
                    this.addOption(this.otherObject[i].name, x => x.setDirectDialog((new DialogList('opt'))
                        .addOption('back', x => x.back())
                        .addOption('drop', x => {
                            game.addActorToCurrScreen(game.player.getExtension('inventory').removeItemFromSlot(i).resetRemovalMark().setPos(addXY(game.player.getPos(), vecScale(game.player.lookAt, 20))));
                            x.back();
                        })));
                }
            }
        }

        return this.dialogList;
    }

    get length() {
        this.getDialogList();

        return this.dialogList ? this.dialogList.length : 0;
    }

}

class DialogSystem {

    dialogList = {};

    dialogStack = [];

    currentDialog = null;
    currentPos = 0;

    #commonActions = {};
    addCommonAction(name, action) {
        this.#commonActions[name] = action;
        return this;
    }
    callAction(name) {
        return this.#commonActions[name](this);
    }

    addDialogList(dialogList) {
        this.dialogList[dialogList.name] = dialogList;
        return this;
    }

    getDialogList(name) {
        return this.dialogList[name];
    }

    setDialog(name) {
        if(dialogList[name]) {
            this.currentDialog = dialogList[name];
        } else {
            this.currentDialog = null;
        }
    }

    setDirectDialog(dialog) {
        if(dialog) {
            this.clearCurrent();
            this.dialogStack.push(dialog);
            this.currentDialog = dialog;
        }
    }

    selectNext() {
        this.currentPos++;
        if(this.currentPos >= this.currentDialog.length) {
            this.currentPos = 0;
        }
        return;
    }

    selectPrev() {
        this.currentPos--;
        if(this.currentPos < 0) {
            this.currentPos = this.currentDialog.length - 1;
        }
        return this;
    }

    clearCurrent() {
        this.currentDialog = null;
        this.currentPos = 0;
    }

    selectDialog(name = 'default') {

        let dialog = this.getDialogList(name);
        this.dialogStack.push(dialog);
        this.clearCurrent();
        if(dialog) {
            this.currentDialog = dialog;
        }
    }

    back() {
        let dialog = null;

        if(this.dialogStack.length > 0) {
            this.dialogStack.pop();
            dialog = this.dialogStack[this.dialogStack.length ? this.dialogStack.length - 1 : 0];

        }
        this.setDirectDialog(dialog);
        this.dialogStack.pop();
    }

    selectCurrent() {
        if(this.currentDialog && this.currentDialog.length > 0) {
            if(this.currentDialog.actionExists(this.currentPos)) {
                this.currentDialog.callAction(this.currentPos, this);
            } else {
                this.clearCurrent();
            }
        } else {
            this.selectDialog('default');
        }
    }

    getCurrentDialog() {

        if(this.currentDialog && !this.currentDialog.getDialogList) {
            debugger;
        }

        return this.currentDialog ? this.currentDialog.getDialogList() : null;
    }

    getCurrentPos() {
        return this.currentPos;
    }


}