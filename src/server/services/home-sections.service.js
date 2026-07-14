import { cacheMethods } from './home-sections/cache.js';
import { loaderMethods } from './home-sections/loaders.js';
import { groupMethods } from './home-sections/groups.js';

export class HomeSectionsService {}

Object.assign(HomeSectionsService, cacheMethods, loaderMethods, groupMethods);
