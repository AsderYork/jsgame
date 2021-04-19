

class StateMachineState {

    name;
    behaviour;
    transitions;

    constructor(name, behaviour, transitions,) {
        this.name = name;
        this.behaviour = behaviour;
        this.transitions = transitions;
    }

    getName() {return this.name;}

    performBehaviour(item, delta) {
       return this.behaviour(item, delta, this);
    }

    findValidTransitions(item, delta) {
        let suitableTransitions = [];
        for(let target in this.transitions) {
            if(this.transitions[target](item, delta, this)) {
                suitableTransitions.push(target);
            }
        }
        return suitableTransitions;
    }

}

class StateMachine {

    states = {};
    currentState = null;

    addState(state) {
        this.states[state.getName()] = state;
        if(this.currentState === null) {
            this.currentState = state;
        }
        return this;
    }

    setState(name) {
        this.currentState = this.states[name];
    }

    getCurrentState() {
        return this.currentState;
    }

    performCurrentStateBehaviour(item, delta) {
        if(this.currentState !== null) {
            let validTransitions = this.currentState.findValidTransitions(item, delta);
            if(validTransitions.length > 0) {
                this.currentState = this.states[validTransitions[0]];
            }

            return this.currentState.performBehaviour(item, delta);
        }
    }

}

function f() {

    let machine = new StateMachine();

    machine.addState(new StateMachineState('idle', (item, delta) => {item.moveTo(item.getPos() + getRandomVec(10));}));

}