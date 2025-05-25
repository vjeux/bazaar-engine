### TODOS

- [x] Fix Search image rendering
- [x] Fix tooltips. Probably better to not use the library.
- [x] Make empty card decks take up space so they don't shift layout when you add player cards
- [x] Fix weird skills that seem to be carditems instead.
      ![weird skill example](./docs/images/image.png)
- [x] Set battle speed, 2x, 3x etc
- [x] Add github repo link to navbar
- [x] Replace old tooltips with new floating UI tooltips
- [x] Move gold/income to separate UI component
- [x] Fix bug: having to doubleclick the red X to remove a card
- [x] Add state saving to URL. Should probably use Zustand.
- [x] Win percentage for RNG in battles
- [x] Change the code to support custom monsters/encounters
- [x] Add player config for health, level, regen, income, gold, etc.
- [x] Add card config, to set dmg, shield etc. Which can be boosted outside of combat.
- [ ] Show storm damage UI
- [ ] Damage numbers above health
- [x] Fork [BazaarPlannerMod](https://github.com/oceanseth/BazaarPlannerMod) and implement open in bazaar-engine
- [ ] Implement websocket connection for mod
- [ ] Card summary similar to the game at the end of the round.
- [ ] DPS, calculate and show. Maybe a query over all events to calculate? Need to remove storm damage.

## Bugs

- [x] Adrenal converter gives double Regen, Triggers do nout account for if Subject and Target is same
- [x] Z-Shield, no multicast
- [ ] Rapid Injection System - Ahexa encounter infinite loop
- [ ] Gunner skill - seems to slow down the Hooverbike Hooligan fight A LOT (to 1 sim per 3 seconds). Also other enemies have different stuff that also slows it down. 
- [ ] MOD - attributes / overrides include aura effects.
- [ ] Gorgon Noble petrifying gaze does not work.
- [ ] Eccentirc Etherwright, Rigged skill does not work

```
 "2": {
          "Id": "2",
          "Trigger": {
            "$type": "TTriggerOnCardPerformedPoison",
            "Subject": {
              "$type": "TTargetCardSection",
              "TargetSection": "SelfHand",
              "ExcludeSelf": false,
              "Conditions": null
            },
            "Target": {
              "$type": "TTargetPlayerRelative",
              "TargetMode": "Self",
              "Conditions": null
            }
          },
          "ActiveIn": "HandOnly",
          "Action": {
            "$type": "TActionPlayerRegenApply",
            "ReferenceValue": null,
            "Duration": {
              "$type": "TDeterminantDuration",
              "DurationType": "UntilEndOfCombat"
            },
            "Target": {
              "$type": "TTargetPlayerRelative",
              "TargetMode": "Self",
              "Conditions": null
            }
          },
          "Prerequisites": null,
          "Priority": "Medium",
          "InternalName": "Adrenal Converter 3",
          "InternalDescription": "When you Poison yourself, gain [--/10/15/20] Regen for the fight and Haste 1 item for 1 second(s).",
          "MigrationData": "2614e6d8-282a-4fe2-8d2f-ab28d4029567",
          "VFXConfig": {
            "VFXOverrideKey": "Assets/TheBazaar/Projectiles/Buffs/Regeneration/Projectile_RegenerationBuff_PV.prefab",
            "VFXShouldPlay": true,
            "VFXIsTakeover": false
          },
          "TranslationKey": "41a7b2eca74526f1e46fe71bd492cadb"
        },
```
