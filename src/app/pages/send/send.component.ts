import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgxSmartModalService } from 'ngx-smart-modal';
import Big from 'big.js';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import Helpers from '../../helpers';
import { PromptService } from '../../components/prompt/prompt.service';
import { AddressBookService } from '../../components/address-book/address-book.service';
import { ContextMenuService } from '../../components/context-menu/context-menu.service';
import { ElectronService } from '../../providers/electron.service';
import { ErrorService } from '../../providers/error.service';
import { NotificationService } from '../../providers/notification.service';
import { Input } from '../../classes';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
})
export class SendComponent implements OnInit, OnDestroy {
  recipients = [];
  changeAddress = '';
  changeAddressLabel = '';
  enabledChangeAddress = false;
  tableStyle = {};
  resizeTimeout: any;
  tableInputs = [];
  helpers = Helpers;
  UI_selectedBalance = new Big(0);
  UI_fee = 0;
  UI_total = new Big(0);
  coinControlTreeMode = true;
  // sort coin control table
  sortField = '';
  sortDesc = false;

  constructor(
    private ngxModal: NgxSmartModalService,
    public wallet: WalletService,
    private prompt: PromptService,
    private addressBook: AddressBookService,
    private contextMenu: ContextMenuService,
    public electron: ElectronService,
    private errorService: ErrorService,
    private notification: NotificationService,
  ) { }

  ngOnInit(): void {
    this.reset(false);
    window.addEventListener('resize', () => this.onResize());
    this.loadState();
  }

  ngOnDestroy(): void {
    this.saveState();
    window.removeEventListener('resize', () => this.onResize());
  }

  onResize(): void {
    if (!this.resizeTimeout) {
      this.resizeTimeout = setTimeout(() => {
        this.resizeTimeout = null
        this.setTableDimensions();
      }, 200)
    }
  }

  setTableDimensions(): void {
    const minHeight = 300;
    let height = window.innerHeight / 2;
    height = height > minHeight ? height : minHeight;
    this.tableStyle = {
      width: window.innerWidth - 28 * 2 - 16 * 2 + 'px',
      height: height + 'px'
    }
  }

  toggleCoinControlFeatures(): void {
    this.electron.ipcRenderer.send('settings', 'SETHIDECOINCONTROLFEATURES', !this.electron.settings.hideCoinControlFeatures);
    this.getInputs().forEach(inp => inp.selected = false);
  }

  onRightClick(e, input: Input): void {
    let items = [];
    if (input.locked) {
      items.push({
        name: 'PAGES.SEND.CONTEXTMENUUNLOCKINPUT',
        func: () => this.lockUnspent(true, input)
      });
    } else {
      items.push({
        name: 'PAGES.SEND.CONTEXTMENULOCKINPUT',
        func: () => this.lockUnspent(false, input)
      });
    }
    this.contextMenu.show(e, items)
  }

  lockUnspent(unlock: boolean, input: Input): void {
    try {
      this.wallet.lockUnspent(unlock, input)
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  getInputs(): Array<Input> {
    let inputs = [];
    this.wallet.accounts.forEach(acc => {
      acc.addresses.forEach(addr => {
        addr.spendableInputs().forEach(inp => {
          inputs.push(inp)
        })
      })
    })
    return inputs;
  }

  reset(resetInputs = true): void {
    this.recipients = []
    this.addRecipient();
    this.changeAddress = '';
    this.changeAddressLabel = '';
    this.enabledChangeAddress = false;

    this.UI_selectedBalance = new Big(0);
    this.UI_fee = 0;
    this.UI_total = new Big(0);
    if (resetInputs) this.getInputs().forEach(inp => inp.selected = false);
  }

  saveState(): void {
    localStorage.setItem('PAGES.SEND', JSON.stringify({
      recipients: this.recipients,
      changeAddress: this.changeAddress,
      changeAddressLabel: this.changeAddressLabel,
      enabledChangeAddress: this.enabledChangeAddress,
      UI_selectedBalance: this.UI_selectedBalance,
      UI_fee: this.UI_fee,
      UI_total: this.UI_total,
      coinControlTreeMode: this.coinControlTreeMode,
    }));
  }

  loadState(): void {
    try {
      const state = localStorage.getItem('PAGES.SEND');
      if (state) {
        const stateJSON = JSON.parse(state);
        this.recipients = stateJSON.recipients;
        this.changeAddress = stateJSON.changeAddress;
        this.changeAddressLabel = stateJSON.changeAddressLabel;
        this.enabledChangeAddress = stateJSON.enabledChangeAddress;
        this.UI_selectedBalance = new Big(stateJSON.UI_selectedBalance);
        this.UI_fee = stateJSON.UI_fee;
        this.UI_total = new Big(stateJSON.UI_total);
        this.coinControlTreeMode = stateJSON.coinControlTreeMode;
      }
    } catch (ex) {

    }
  }

  removeRecipient(index): void {
    this.recipients.splice(index, 1);
  }

  addRecipient(): void {
    this.recipients.push({
      address: '',
      amount: '',
      label: ''
    });
  }

  getSavedAccount(address: string, label: string) {
    // check address book
    for (let i = 0; i < this.wallet.addressBook.length; i++) {
      let addr = this.wallet.addressBook[i];
      if (address && addr.address.toLowerCase().trim() === address.toLowerCase().trim())
        return addr.account;
      else if (label && addr.account.toLowerCase().trim() === label.toLowerCase().trim())
        return addr.address;
    }
    // check my accounts
    let accounts = this.wallet.getAccounts()
    for (let i = 0; i < accounts.length; i++) {
      let addr = accounts[i];
      if (address && addr.address.toLowerCase().trim() === address.toLowerCase().trim())
        return addr.name;
      else if (label && addr.name.toLowerCase().trim() === label.toLowerCase().trim())
        return addr.address;
    }
    return "";
  }

  checkSavedAccount(recp: any, isAddress: boolean) {
    if (isAddress) {
      if (!recp.address) return recp.label = ''
      let acc = this.getSavedAccount(recp.address, "")
      if (acc) recp.label = acc;
    } else {
      if (!recp.label) return recp.address = '';
      let addr = this.getSavedAccount("", recp.label)
      if (addr) recp.address = addr;
    }
  }

  checkSavedChangeAccount() {
    let acc = this.getSavedAccount(this.changeAddress, "");
    if (acc) this.changeAddressLabel = acc;
    else this.changeAddressLabel = "";
  }

  async getFromAddressBook(recp): Promise<void> {
    const addr = await this.addressBook.getAddress();
    if (addr) {
      recp.address = addr.address;
      recp.label = addr.label
    }
  }

  changeCoinControlMode() {
    this.coinControlTreeMode = !this.coinControlTreeMode;
    this.getTableInputs();
  }

  showSelectInputsModal(): void {
    this.setTableDimensions();
    this.getTableInputs();
    this.ngxModal.getModal('selectInputsModal').open()
  }

  getTableInputs() {
    this.tableInputs = [];
    if (this.coinControlTreeMode) {
      this.wallet.accounts.forEach(acc => {
        let header = { account: acc.name, address: acc.address, amount: Big(0), selected: false, inputs: [], showChildren: false };
        acc.addresses.forEach(addr => {
          addr.allInputs().forEach(inp => {
            header.inputs.push(inp);
            header.amount = header.amount.add(inp.amount);
          })
        })
        if (header.amount.gt(0)) {
          this.tableInputs.push(header);
          this.checkHeaderSelected(header)
        }
      })
    } else {
      this.wallet.accounts.forEach(acc => {
        acc.addresses.forEach(addr => {
          addr.allInputs().forEach(inp => {
            this.tableInputs.push(inp)
          })
        })
      })
    }
    this.checkCoinControlSort();
  }

  toggleHeader(header) {
    header.inputs.forEach((inp: Input) => {
      if (!inp.locked) inp.selected = header.selected;
    })
  }

  checkHeaderSelected(header) {
    for (let i = 0; i < header.inputs.length; i++) {
      if (!header.inputs[i].locked && !header.inputs[i].selected) {
        header.selected = false;
        return
      }
    }
    header.selected = true;
  }

  getSelectedAmount(): Big {
    let amount = Big(0);
    this.getInputs().forEach(inp => {
      if (inp.selected) amount = amount.add(inp.amount)
    })
    return amount;
  }

  getSelectedAftFee(): Big {
    return this.getSelectedAmount().sub(Helpers.getFee(this.getSelectedQuantity(), this.recipients.length, this.wallet.fee))
  }

  getSelectedQuantity(): number {
    let selected = 0;
    this.getInputs().forEach(inp => {
      if (inp.selected) selected++
    })
    return selected;
  }

  selectUnselectAll(): void {
    const selected = this.getSelectedQuantity();
    const total = this.getInputs().length;
    const spread = selected / total;
    let select = true;
    if (spread > 0.5) select = false
    this.getInputs().forEach(inp => inp.selected = select)
    if (this.coinControlTreeMode) {
      this.tableInputs.forEach(header => this.checkHeaderSelected(header));
    }
  }

  cancelSelectInputsModal(): void {
    this.getInputs().forEach(inp => inp.selected = false)
    this.ngxModal.getModal('selectInputsModal').close();
  }

  doneSelectInputsModal(): void {
    this.ngxModal.getModal('selectInputsModal').close();
    this.UI_selectedBalance = this.getSelectedBalance();
    this.calculateOutput()
  }

  calculateOutput(): void {
    this.UI_fee = this.calculateFee();
    this.UI_total = this.getActualTotal();
  }

  useAvailable(recipient): void {
    recipient.amount = 0;
    recipient.amount = this.getSelectedBalance().sub(this.getExpectedTotal());
    recipient.amount = Big(recipient.amount).add(this.getBaseFee()).sub(this.calculateFee());
    this.calculateOutput();
  }

  getExpectedTotal(): Big {
    let total = Big(this.getBaseFee());
    this.recipients.forEach(recipient => {
      if (recipient.amount) total = total.add(recipient.amount);
    });
    return Helpers.roundCoins(total);
  }

  getActualTotal(): Big {
    let total = Big(this.calculateFee());
    this.recipients.forEach(recipient => {
      if (recipient.amount) total = total.add(recipient.amount);
    });
    return Helpers.roundCoins(total);
  }

  checkTransactionValid(): boolean {
    if (this.getActualTotal().gt(this.getSelectedBalance())) {
      this.notification.notify('error', 'NOTIFICATIONS.SENDINGEXCEEDSBALANCE');
      return false;
    }
    if (this.enabledChangeAddress && !this.changeAddress) {
      this.notification.notify('error', 'NOTIFICATIONS.MISSINGCHANGEADDRESS');
      return false;
    }
    for (let i = 0; i < this.recipients.length; i++) {
      if (!this.recipients[i].address) {
        this.notification.notify('error', 'NOTIFICATIONS.MISSINGDESTINATIONADDRESS');
        return false;
      }
      if (!this.recipients[i].amount) {
        this.notification.notify('error', 'NOTIFICATIONS.MISSINGAMOUNTTOSEND');
        return false;
      }
    }
    return true;
  }

  getBaseFee(): Big {
    return Helpers.getFee(1, this.recipients.length, this.wallet.fee)
  }

  calculateFee(): Big {
    let total = Big(0);
    this.recipients.forEach(recipient => {
      if (recipient.amount) total = total.add(recipient.amount);
    });
    if (total.gt(0)) {
      const inputs = this.selectInputs();
      if (inputs.length) return Helpers.getFee(inputs.length, this.recipients.length, this.wallet.fee);
    }
    return this.getBaseFee()
  }

  async send(): Promise<void> {
    if (!this.checkTransactionValid()) return;
    let outputs = {};
    // get inputs
    let inputs = this.selectInputs();

    if (!inputs.length)
      return this.notification.notify('error', 'NOTIFICATIONS.INSUFFICIENTBALANCE');

    // get outputs
    for (let i = 0; i < this.recipients.length; i++) {
      outputs[this.recipients[i].address] = Number(this.recipients[i].amount);
    }
    // get fee
    let fee = this.calculateFee();
    // get change address is any
    let change = this.enabledChangeAddress ? this.changeAddress : null;

    try {
      let passphrase, stakingOnly;
      if (this.wallet.requireUnlock()) [passphrase, stakingOnly] = await this.prompt.getPassphrase();

      this.notification.loading('NOTIFICATIONS.SENDINGTRANSACTION');
      try {
        const res = await this.wallet.sendTransaction(inputs, outputs, fee, passphrase, change);
        if (res.success) {
          this.notification.notify('success', 'NOTIFICATIONS.TRANSACTIONSENT');
          // add and labeled addressed to address book
          this.addRecipientsToAddressBook();
          // reset page
          this.reset();
        } else {
          this.notification.notify('error', res.message);
          // load accounts
          this.wallet.requestDataSync(DATASYNCTYPES.ACCOUNTS);
        }
        // load transactions
        this.wallet.requestDataSync(DATASYNCTYPES.TRANSACTIONS);
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
      this.notification.dismissNotifications();
    } catch (ex) {
      // passphrase prompt closed
    }
  }

  addRecipientsToAddressBook() {
    this.recipients.forEach(async recp => {
      if (recp.label) {
        // check we don't already have it
        let alreadyHave = false;
        for (let i = 0; i < this.wallet.accounts.length; i++) {
          const acc = this.wallet.accounts[i];
          if (acc.address === recp.address && acc.name === recp.label) {
            alreadyHave = true;
            break;
          }
        }
        if (!alreadyHave) {
          try {
            await this.wallet.addressBookAdd(recp.address, recp.label)
          } catch (ex) {
            // we don't care if this fails here
          }
        }
      }
    })
  }

  getInputOptions(): Array<{ txid: string, vout: number, balance: Big }> {
    let utxos = [];
    const manualSelect = this.getSelectedQuantity() > 0;
    this.getInputs().forEach(inp => {
      if (!manualSelect || inp.selected)
        utxos.push({
          txid: inp.txid,
          vout: inp.vout,
          balance: inp.amount
        });
    })
    return utxos;
  }

  selectInputs(): Array<{ txid: string, vout: number }> {
    const required = this.getExpectedTotal();
    const utxos = this.getInputOptions();

    let selectedInputs = [];

    // check for exact match
    for (let i = 0; i < utxos.length; i++) {
      if ((utxos[i].balance.eq(required))) {
        selectedInputs.push(utxos[i]);
        break;
      }
    }

    if (!selectedInputs.length) {
      for (let i = 0; i < 100; i++) {
        let newCombination = [];
        let tmpUtxos = utxos.slice();
        let tmpTotal = Big(0);

        while (tmpUtxos.length) {
          let limit = tmpUtxos.length - 2;
          if (limit < 0) limit = 0;
          let index = tmpUtxos.length
          while (index >= tmpUtxos.length) index = Math.round(Math.random() * limit);
          tmpTotal = tmpTotal.add(tmpUtxos[index].balance); // update total
          newCombination.push(tmpUtxos[index]); // add to combination       
          tmpUtxos.splice(index, 1); // remove from possible combinations
          if (tmpTotal.gte(required) || !tmpUtxos.length) break;
        }

        if (tmpTotal.eq(required)) {
          selectedInputs = newCombination.slice();
          break;
        } else if (tmpTotal.gt(required) && (!selectedInputs.length || newCombination.length < selectedInputs.length)) {
          selectedInputs = newCombination.slice();
        }
      }
    }

    let inputs = [];
    selectedInputs.forEach(input => {
      inputs.push({ txid: input.txid, vout: input.vout });
    })

    return inputs;
  }

  getSelectedBalance(): Big {
    let balance = new Big(0);
    const inputs = this.getInputOptions();
    inputs.forEach(inp => balance = balance.add(inp.balance));
    return balance;
  }

  sortCoinControl(field) {
    this.sortField = field;
    this.sortDesc = !this.sortDesc;
    this.checkCoinControlSort();
  }

  checkCoinControlSort() {
    if (this.sortField && this.tableInputs.length) {
      let sortFunc = (a, b) => {
        let aField = a[this.sortField];
        let bField = b[this.sortField];
        if (this.sortField === 'amount') {
          aField = Number(aField)
          bField = Number(bField);
        }
        if (aField > bField) {
          return !this.sortDesc ? 1 : -1;
        } else if (aField < bField) {
          return this.sortDesc ? 1 : -1;
        } else {
          return 0;
        }
      };

      this.tableInputs = [].concat(this.tableInputs).sort(sortFunc);
      // sort children if in tree mode
      this.tableInputs.forEach(tableInput => {
        if (tableInput.inputs) tableInput.inputs.sort(sortFunc);
      });
    }
  }


}
