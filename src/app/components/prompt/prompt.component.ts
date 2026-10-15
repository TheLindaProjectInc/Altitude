import { Component, ViewChild, ElementRef } from '@angular/core';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { PromptService } from './prompt.service';
import { Account } from 'app/metrix/classes/account';

@Component({
    selector: 'prompt-container',
    templateUrl: './prompt.component.html',
    standalone: false
})
export class PromptComponent {

  @ViewChild("passphrase") passphraseField: ElementRef;

  passphraseModal = {
    passphrase: "",
    showStakingOnly: false,
    stakingOnly: false,
    resolve: null,
    reject: null,
    hide: () => this.ngxModal.getModal('passphraseModal').close(),
    reset: () => {
      this.passphraseModal.passphrase = "";
      this.passphraseModal.showStakingOnly = false;
      this.passphraseModal.stakingOnly = false;
    },
    show: (showStakingOnly = false) => {
      this.passphraseModal.reset();
      this.passphraseModal.showStakingOnly = showStakingOnly;
      this.passphraseModal.stakingOnly = showStakingOnly;
      this.ngxModal.getModal('passphraseModal').open();
      setTimeout(() => this.passphraseField.nativeElement.focus(), 300);
      return new Promise((resolve, reject) => {
        this.passphraseModal.resolve = resolve;
        this.passphraseModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.passphraseModal.hide();
      if (!this.passphraseModal.passphrase) this.passphraseModal.reject();
      else this.passphraseModal.resolve([this.passphraseModal.passphrase, this.passphraseModal.stakingOnly]);
    },
    buttonCancel: () => {
      this.passphraseModal.hide();
      this.passphraseModal.reject();
    }
  }

  clientUpdateModal = {
    resolve: null,
    reject: null,
    showSkip: true,
    hide: () => this.ngxModal.getModal('clientUpdateModal').close(),
    show: (showSkip = true) => {
      this.clientUpdateModal.showSkip = showSkip;
      this.ngxModal.getModal('clientUpdateModal').open();
      return new Promise((resolve, reject) => {
        this.clientUpdateModal.resolve = resolve;
        this.clientUpdateModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.clientUpdateModal.hide();
      this.clientUpdateModal.resolve();
    },
    buttonCancel: (skip) => {
      this.clientUpdateModal.hide();
      this.clientUpdateModal.reject(skip);
    }
  }

  walletUpdateModal = {
    resolve: null,
    reject: null,
    showSkip: true,
    hide: () => this.ngxModal.getModal('walletUpdateModal').close(),
    show: (showSkip = true) => {
      this.walletUpdateModal.showSkip = showSkip;
      this.ngxModal.getModal('walletUpdateModal').open();
      return new Promise((resolve, reject) => {
        this.walletUpdateModal.resolve = resolve;
        this.walletUpdateModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.walletUpdateModal.hide();
      this.walletUpdateModal.resolve();
    },
    buttonCancel: (skip) => {
      this.walletUpdateModal.hide();
      this.walletUpdateModal.reject(skip);
    }
  }

  walletUpdateReadyModal = {
    resolve: null,
    reject: null,
    hide: () => this.ngxModal.getModal('walletUpdateReadyModal').close(),
    show: () => {
      this.ngxModal.getModal('walletUpdateReadyModal').open();
      return new Promise((resolve, reject) => {
        this.walletUpdateReadyModal.resolve = resolve;
        this.walletUpdateReadyModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.walletUpdateReadyModal.hide();
      this.walletUpdateReadyModal.resolve();
    },
    buttonCancel: () => {
      this.walletUpdateReadyModal.hide();
      this.walletUpdateReadyModal.reject();
    }
  }

  changePassphraseModal = {
    currentPassphrase: "",
    newPassphrase: "",
    confPassphrase: "",
    resolve: null,
    reject: null,
    hide: () => this.ngxModal.getModal('changePassphraseModal').close(),
    reset: () => {
      this.changePassphraseModal.currentPassphrase = "";
      this.changePassphraseModal.newPassphrase = "";
      this.changePassphraseModal.confPassphrase = "";
    },
    show: () => {
      this.changePassphraseModal.reset();
      this.ngxModal.getModal('changePassphraseModal').open();
      return new Promise((resolve, reject) => {
        this.changePassphraseModal.resolve = resolve;
        this.changePassphraseModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.changePassphraseModal.hide();
      this.changePassphraseModal.resolve([this.changePassphraseModal.currentPassphrase, this.changePassphraseModal.newPassphrase, this.changePassphraseModal.confPassphrase]);
    },
    buttonCancel: () => {
      this.changePassphraseModal.hide();
      this.changePassphraseModal.reject();
    }
  }

  encryptModal = {
    newPassphrase: "",
    confPassphrase: "",
    resolve: null,
    reject: null,
    hide: () => this.ngxModal.getModal('encryptModal').close(),
    reset: () => {
      this.encryptModal.newPassphrase = "";
      this.encryptModal.confPassphrase = "";
    },
    show: () => {
      this.encryptModal.reset();
      this.ngxModal.getModal('encryptModal').open();
      return new Promise((resolve, reject) => {
        this.encryptModal.resolve = resolve;
        this.encryptModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.encryptModal.hide();
      this.encryptModal.resolve([this.encryptModal.newPassphrase, this.encryptModal.confPassphrase]);
    },
    buttonCancel: () => {
      this.encryptModal.hide();
      this.encryptModal.reject();
    }
  }

  alertModal = {
    resolve: null,
    reject: null,
    title: '',
    content: '',
    extraContent: '',
    doneButtonContent: '',
    cancelButtonContent: '',
    hide: () => this.ngxModal.getModal('alertModal').close(),
    show: (title, content, doneButtonContent, cancelButtonContent, extraContent = '') => {
      this.alertModal.title = title;
      this.alertModal.content = content;
      this.alertModal.extraContent = extraContent;
      this.alertModal.doneButtonContent = doneButtonContent;
      this.alertModal.cancelButtonContent = cancelButtonContent;
      this.ngxModal.getModal('alertModal').open();
      return new Promise((resolve, reject) => {
        this.alertModal.resolve = resolve;
        this.alertModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.alertModal.hide();
      this.alertModal.resolve();
    },
    buttonCancel: () => {
      this.alertModal.hide();
      this.alertModal.reject();
    }
  }

  addRemoteMNModal = {
    resolve: null,
    reject: null,
    alias: '',
    ip: '',
    key: '',
    txHash: '',
    txIndex: '',
    hide: () => this.ngxModal.getModal('addRemoteMNModal').close(),
    reset: () => {
      this.addRemoteMNModal.alias = "";
      this.addRemoteMNModal.ip = "";
      this.addRemoteMNModal.key = "";
      this.addRemoteMNModal.txHash = "";
      this.addRemoteMNModal.txIndex = "";
    },
    show: () => {
      this.addRemoteMNModal.reset();
      this.ngxModal.getModal('addRemoteMNModal').open();
      return new Promise((resolve, reject) => {
        this.addRemoteMNModal.resolve = resolve;
        this.addRemoteMNModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.addRemoteMNModal.hide();
      this.addRemoteMNModal.resolve([
        this.addRemoteMNModal.alias,
        this.addRemoteMNModal.ip,
        this.addRemoteMNModal.key,
        this.addRemoteMNModal.txHash,
        this.addRemoteMNModal.txIndex
      ]);
    },
    buttonCancel: () => {
      this.addRemoteMNModal.hide();
      this.addRemoteMNModal.reject();
    }
  }

  dappSendModal = {
    origin: '',
    contractAddress: '',
    amount: 0,
    data: '',
    gasLimit: 250000,
    gasPrice: 5000,
    resolve: null,
    reject: null,
    hide: () => this.ngxModal.getModal('dappSendModal').close(),
    show: (origin: string, contractAddress: string, amount: number, data: string, gasLimit: number, gasPrice: number) => {
      this.dappSendModal.origin = origin;
      this.dappSendModal.contractAddress = contractAddress;
      this.dappSendModal.amount = amount;
      this.dappSendModal.data = data;
      this.dappSendModal.gasLimit = gasLimit;
      this.dappSendModal.gasPrice = gasPrice;
      this.ngxModal.getModal('dappSendModal').open();
      return new Promise((resolve, reject) => {
        this.dappSendModal.resolve = resolve;
        this.dappSendModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.dappSendModal.hide();
      this.dappSendModal.resolve({ gasLimit: this.dappSendModal.gasLimit, gasPrice: this.dappSendModal.gasPrice });
    },
    buttonCancel: () => {
      this.dappSendModal.hide();
      this.dappSendModal.reject();
    },
    // gasPrice is satoshi/gas (MetriMask convention); converted here purely for display
    maxFee: () => (Number(this.dappSendModal.gasLimit) || 0) * (Number(this.dappSendModal.gasPrice) || 0) * 1e-8,
    maxTotal: () => (Number(this.dappSendModal.amount) || 0) + this.dappSendModal.maxFee(),
  }

  dappSignModal = {
    origin: '',
    message: '',
    resolve: null,
    reject: null,
    hide: () => this.ngxModal.getModal('dappSignModal').close(),
    show: (origin: string, message: string) => {
      this.dappSignModal.origin = origin;
      this.dappSignModal.message = message;
      this.ngxModal.getModal('dappSignModal').open();
      return new Promise((resolve, reject) => {
        this.dappSignModal.resolve = resolve;
        this.dappSignModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.dappSignModal.hide();
      this.dappSignModal.resolve();
    },
    buttonCancel: () => {
      this.dappSignModal.hide();
      this.dappSignModal.reject();
    },
  }

  dappConnectModal = {
    origin: '',
    accounts: [] as Account[],
    selectedAddress: '',
    resolve: null,
    reject: null,
    hide: () => this.ngxModal.getModal('dappConnectModal').close(),
    show: (origin: string, accounts: Account[]) => {
      this.dappConnectModal.origin = origin;
      this.dappConnectModal.accounts = accounts;
      this.dappConnectModal.selectedAddress = accounts.length ? accounts[0].address : '';
      this.ngxModal.getModal('dappConnectModal').open();
      return new Promise((resolve, reject) => {
        this.dappConnectModal.resolve = resolve;
        this.dappConnectModal.reject = reject;
      })
    },
    buttonDone: () => {
      this.dappConnectModal.hide();
      this.dappConnectModal.resolve(this.dappConnectModal.selectedAddress);
    },
    buttonCancel: () => {
      this.dappConnectModal.hide();
      this.dappConnectModal.reject();
    },
  }

  constructor(
    private prompt: PromptService,
    private ngxModal: NgxSmartModalService
  ) {
    prompt.getPassphrase = this.passphraseModal.show;
    prompt.promptUpdateClient = this.clientUpdateModal.show;
    prompt.promptUpdateWallet = this.walletUpdateModal.show;
    prompt.promptInstallWallet = this.walletUpdateReadyModal.show;
    prompt.changePassphrase = this.changePassphraseModal.show;
    prompt.encrypt = this.encryptModal.show;
    prompt.alert = this.alertModal.show;
    prompt.sendContractApproval = this.dappSendModal.show;
    prompt.signMessageApproval = this.dappSignModal.show;
    prompt.connectApproval = this.dappConnectModal.show;
  }




}
