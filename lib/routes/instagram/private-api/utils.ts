import { IgApiClient } from 'instagram-private-api';
import logger from '@/utils/logger';
import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';

const ig = new IgApiClient();

async function login(ig, cache) {
    if (!config.instagram || !config.instagram.username || !config.instagram.password) {
        throw new ConfigNotFoundError('Instagram RSS is disabled due to the lack of <a href="https://docs-rss.windego.cn/deploy/config#route-specific-configurations">relevant config</a>');
    }
    const LOGIN_CACHE_KEY = 'instagram:login';
    const { username, password } = config.instagram;
    const state = await cache.get(LOGIN_CACHE_KEY);
    if (state) {
        ig.state.deserialize(state);
    } else {
        ig.state.generateDevice(username);
        // try {
        //     await ig.simulate.preLoginFlow();
        // } catch (error) {
        //     logger.info('Instagram preLoginFlow fail: ' + error);
        // }
        await ig.account.login(username, password);
        process.nextTick(() => ig.simulate.postLoginFlow());
        logger.debug('Instagram login success.');
    }
    // Post request hook
    ig.request.end$.subscribe(async () => {
        const loginState = await ig.state.serialize();
        delete loginState.constants;
        // lifetime is defined in
        // https://github.com/dilame/instagram-private-api/blob/6c160b2defcf8b0790b5a80033aab3e3084d0114/docs/classes/index/State.md#clientsessionidlifetime
        await cache.set(LOGIN_CACHE_KEY, loginState, 1_200_000);
    });
}

export { ig, login };
