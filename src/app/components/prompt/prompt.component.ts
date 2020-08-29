import { Component, ViewChild, ElementRef } from '@angular/core';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { PromptService } from './prompt.service';

@Component({
  selector: 'prompt-container',
  templateUrl: './prompt.component.html'
})
export class PromptComponent {

  @ViewChild("passphrase", { static: false }) passphraseField: ElementRef;

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

  constructor(
    private prompt: PromptService,
    private ngxModal: NgxSmartModalService
  ) {
    prompt.getPassphrase = this.passphraseModal.show;
    prompt.promptUpdateClient = this.clientUpdateModal.show;
    prompt.promptUpdateWallet = this.walletUpdateModal.show;
    prompt.changePassphrase = this.changePassphraseModal.show;
    prompt.encrypt = this.encryptModal.show;
    prompt.alert = this.alertModal.show;
  }




}
