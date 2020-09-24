import { Pipe, PipeTransform } from '@angular/core';
import Helpers from 'app/helpers';

@Pipe({ name: 'prettyCoins' })
export class PrettyCoinsPipe implements PipeTransform {
    transform(value: number, decimals?: number): string {
        return Helpers.prettyCoins(value, decimals);
    }
}