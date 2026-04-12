export const defaultAuthority = {
  createInitialPlayerState() {
    return { x: 0, y: 0, z: 0 };
  },

  filterClientStateUpdate({ proposedState, proposedMeta }) {
    const state = typeof proposedState === "object" && proposedState ? proposedState : {};
    const meta = typeof proposedMeta === "object" && proposedMeta ? proposedMeta : {};
    return { state, meta };
  },

  onPlayerJoin() {},

  onPlayerLeave() {},

  onLobbyEmpty() {},

  onBeforeBroadcast({ snapshot }) {
    return snapshot;
  },

  onCustomMessage() {
    return { handled: false };
  },
};
