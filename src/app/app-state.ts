import { makeAutoObservable, observable } from "mobx";

export class AppState {
  @observable loaded = false;
  @observable started = false;

  constructor() {
    makeAutoObservable(this);
  }
}
