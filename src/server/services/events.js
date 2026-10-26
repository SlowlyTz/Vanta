// Domain events for the realtime layer, so services never import the sockets.
// main.js connects the socket hubs to them.
import { EventEmitter } from 'events';

export const appEvents = new EventEmitter();

// Something behind the menu dots changed (requests, reports, decisions).
export const NOTIFICATIONS_CHANGED = 'notifications-changed';
