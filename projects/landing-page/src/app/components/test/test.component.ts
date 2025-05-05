import { Component } from '@angular/core';
import { MboxInfoService } from '../../../../../common/mbox-info.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss'],
})
export class TestComponent {
  constructor(public mboxservice: MboxInfoService) {}
}
