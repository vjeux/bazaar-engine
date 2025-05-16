- Crit is only checked/applied to items with a Cooldown.
- Most Cards have an internal cooldown for max firing per second. See [constants.ts](../engine2/constants.ts) for the `CARD_INTERNAL_COOLDOWN_FIRES_PER_SECOND` value. Applies to multicast as well as responsive items such as caltrops (deal x damage whenever your opponent uses a weapon)


Fix:

Targeting
GetACtionValue
Slop actions

TODOS:
add event/command log

add better multicast
add critchance to values


make cardconditions use getcardattribute for numbers and tags


BUGS:
Kyver drone v katana, when stinger slows katana, damage is not applied to kyver drone from katana