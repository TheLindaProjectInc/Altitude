import { ChainType } from 'app/enum';
import { Component } from '@angular/core';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { TranslationService } from 'app/providers/translation.service';
import { ErrorService } from 'app/providers/error.service';
import { CurrencyService } from 'app/providers/currency.service';
import { PriceOracle } from 'app/providers/priceoracle.service';

Chart.register(...registerables);
@Component({
  selector: 'market-price-chart',
  templateUrl: './market-price.component.html',
  styleUrls: ['./market-price.component.scss']
})

export class MarketPriceComponent {

  priceChart: Chart;
  marketPeriod = 1;
  loadingChart: boolean = true;
  chartLoadFailed: boolean = false;
  labels: string[] = [];
  pricesMRX: number[] = [];
  pricesUSD: number[] = [];

  constructor(
    private priceOracle: PriceOracle
  ) {
  }

  ngOnInit() {
    this.loadMarketData();
    setTimeout(() => this.loadMarketData() ,(1000 * 60) * 15);
  }

  updateChart(days) {
    this.marketPeriod = days;
    this.loadMarketData();
  }

  async loadMarketData() {
    const data = {
      labels: [],
      datasets: [
        {
          label: 'MRX/USD',
          backgroundColor: 'rgb(128, 0, 128, 0.35)',
          borderColor: 'purple',
          data: [],
          fill: true,
          yAxisID: 'mrx'
        },
        {
          label: 'USD/MRX',
          backgroundColor: 'rgba(245, 245, 245, 0.35)',
          borderColor: 'whitesmoke',
          data: [],
          fill: true,
          yAxisID: 'usd'
        }
      ]
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: data,
      options: {
        layout: {
          padding: {
            left: 5,
            right: 5
          }
        },
        plugins: {
          tooltip: {
            enabled: true,
            usePointStyle: true,
            callbacks: {
              label: (data) => {
                return data.parsed.y < 1
                  ? data.parsed.y.toFixed(7)
                  : `${data.parsed.y}`;
              }
            }
          },
          legend: {
            display: true,
            labels: {
              color: 'rgba(245, 245, 245, 0.55)'
            }
          }
        },
        maintainAspectRatio: false,
        scales: {
          mrx: {
            type: 'linear',
            position: 'right',
            ticks: {
              precision: 0,
              color: 'purple',
              font: {
                weight: 'bold'
              }
            }
          },
          usd: {
            type: 'linear',
            position: 'left',
            ticks: {
              callback: (val) =>
                typeof val === 'number' ? val.toFixed(7) : Number(val).toFixed(7),
              precision: 7,
              color: 'whitesmoke',
              font: {
                weight: 'bold'
              }
            }
          }
        }
      }
    };

    this.chartLoadFailed = false;
    this.loadingChart = true;

    if (this.priceChart != undefined) {
      this.priceChart.destroy();
    }

    this.priceChart = new Chart((document.getElementById('priceChart') as any).getContext("2d"), config);

    try {
      let oraclePrices;
      if (this.marketPeriod === 1) {
        oraclePrices = await this.priceOracle.oracle.recentPriceHistory();
      } else if (this.marketPeriod === 7) {
        const index = await this.priceOracle.oracle.priceIndex();
        if (index >= 7 * 24) {
          oraclePrices = await this.priceOracle.oracle.priceHistory(
            index - BigInt(7 * 24),
            BigInt(7 * 24)
          );
        } else {
          oraclePrices = await this.priceOracle.oracle.priceHistory(BigInt(0), index + BigInt(1));
        }
      }
      
      let lastDate = undefined;
    
      for (const data of oraclePrices) {
        let date = new Date(Number(data[2].toString()) * 1000);
  
        this.priceChart.data.labels.push(
          `${
            date.toLocaleDateString() == lastDate 
            ? '' 
            : `${date.toLocaleDateString()} `
          }${date.toLocaleTimeString()}`
        );
        lastDate = date.toLocaleDateString();
        this.priceChart.data.datasets.forEach((dataset) => {
          if (dataset.label === 'MRX/USD') {
            dataset.data.push(
              Number((Number(data[0]) * 1e-8).toFixed(8))  // MRX/USD
            );
          } else if (dataset.label === 'USD/MRX') {
            dataset.data.push(
              Number((1 / (Number(data[0]) * 1e-8)).toFixed(7)) // USD/MRX
            );
          }
        });
      }
      this.priceChart.update();
    } catch(ex) {
      this.chartLoadFailed = true;
      console.log(ex);
    }

    this.loadingChart = false;
  }
}
