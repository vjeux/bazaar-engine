import apiItems from "./json/apiItems.json";
import { Item } from "./types/apiItems";
import _ from "lodash";
import { Card } from "./types/cardTypes";
import { PartialDeep } from "type-fest";
import Cards from "./json/v2_Cards.json";

export function deepIntersection<T extends object, U extends object>(
  obj1: T,
  obj2: U
): Partial<T & U> {
  if (!_.isObject(obj1) || !_.isObject(obj2)) {
    return _.isEqual(obj1, obj2) ? obj1 : {};
  }

  const result: Record<string, any> = {};
  const keys1 = Object.keys(obj1);

  for (const key of keys1) {
    if (key in obj2) {
      if (
        _.isObject(obj1[key as keyof T]) &&
        _.isObject(obj2[key as keyof U])
      ) {
        const intersection = deepIntersection(
          obj1[key as keyof T] as object,
          obj2[key as keyof U] as object
        );
        if (!_.isEmpty(intersection)) {
          result[key] = intersection;
        }
      } else if (_.isEqual(obj1[key as keyof T], obj2[key as keyof U])) {
        result[key] = obj1[key as keyof T];
      }
    }
  }

  return result as Partial<T & U>;
}

const items: Item[] = apiItems.data as Item[];
const CardsValues = Object.values(Cards);

let result: PartialDeep<Card> | undefined = undefined;

items.forEach((item) => {
  // Find the item in CardsValues
  const card = CardsValues.find((card) => card.Id === item.id);

  if (card) {
    if (result === undefined) {
      result = card;
    } else {
      result = deepIntersection(result, card);
    }
  }
});

console.log(result);

// write result to file
import fs from "fs";
fs.writeFileSync(
  "./src/json/intersection.json",
  JSON.stringify(result, null, 2)
);
