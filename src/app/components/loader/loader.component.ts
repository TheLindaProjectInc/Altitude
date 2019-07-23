import { Component, Input } from '@angular/core';

@Component({
  selector: 'loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent {

  @Input() size: number;
  @Input() paddingTop: number;
  @Input() paddingBottom: number;

  constructor(
  ) { }

  get dimensions() {
    let size = this.size || 100;
    return {
      height: size + 'px', width: size + 'px'
    };
  }

  get position() {
    let paddingTop = this.paddingTop || 0;
    let paddingBottom = this.paddingBottom || 0;
    return {
      'padding-top': paddingTop + 'px',
      'padding-bottom': paddingBottom + 'px'
    };
  }

}
