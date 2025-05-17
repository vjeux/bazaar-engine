- Crit is only checked/applied to items with a Cooldown.
- Most Cards have an internal cooldown for max firing per second. See [constants.ts](../engine2/constants.ts) for the `CARD_INTERNAL_COOLDOWN_FIRES_PER_SECOND` value. Applies to multicast as well as responsive items such as caltrops (deal x damage whenever your opponent uses a weapon)

Card fired vs used
- Fired uses ammo, on cooldownmax
- used is multicast


TODOS:
add better multicast
Dont fire events until after the card has finished executing its commands. Some internal queue maybe idk.
use getPlayerAttribute for the palces where it's needed.
Carry charge onto next use, instead of simply loosing it. maybe just let items charge past CooldownMax and minus CooldownMax on fire?


BUGS:
Kyver drone v katana, when stinger slows katana, damage is not applied to kyver drone from katana