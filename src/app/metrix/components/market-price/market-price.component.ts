import { Component } from '@angular/core';
import Helpers from 'app/helpers';
import { Chart, ChartPoint } from 'chart.js';
import { TranslationService } from 'app/providers/translation.service';
import { ErrorService } from 'app/providers/error.service';
import { CurrencyService } from 'app/providers/currency.service';
import Big from 'big.js';
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

  constructor(
    private translation: TranslationService,
    private error: ErrorService,
    private currenyService: CurrencyService
  ) {
  }

  ngOnInit() {
    this.loadMarketData();
  }

  updateChart(days) {
    this.marketPeriod = days;
    this.loadMarketData();
  }

  async loadMarketData() {
    this.chartLoadFailed = false;
    this.loadingChart = true;
    if (this.priceChart) this.priceChart.destroy();
    try {
      let prices: any = await this.currenyService.getMarketChart(this.marketPeriod);
      this.drawIncomeChart(prices);
    } catch (ex) {
      this.chartLoadFailed = true;
    }
    this.loadingChart = false;
  }

  async drawIncomeChart(priceData: Array<any>) {
    let incomeData: Array<ChartPoint> = [];
    let labels = [];

    let min = Infinity;
    let max = 0;

    let prices = [];
    priceData.sort((a, b) => { return a[0] - b[0] });
    for (let i = 0; i < priceData.length; i++) {
      let pricePoint = priceData[i];
      let date = new Date(pricePoint[0]);
      let value = Number(Helpers.roundCoins(Helpers.toSatoshi(Big(pricePoint[1])), 2))
      let key = await this.monthIndexToName(date.getMonth()) + '-' + date.getDate() + '-' + date.getHours();
      if (!prices[key]) prices[key] = 0;
      if (prices[key] < value) prices[key] = value
    }

    let timestamps = Object.keys(prices);
    for (let i = 0; i < timestamps.length; i++) {
      let ts = timestamps[i];
      let value = prices[ts];
      let dateString = '';
      // 24 hours
      if (this.marketPeriod === 1) {
        let hour = Number(ts.split('-')[2]);
        if (hour === 0) dateString = `12:00am`;
        else if (hour < 12) dateString = `${hour}:00am`;
        else dateString = `${hour - 12}:00pm`;
      } else {
        let month = ts.split('-')[0];
        let date = ts.split('-')[1];
        dateString = month + ' ' + date;
      }
      labels.push(dateString);
      incomeData.push({ x: i, y: value })
      if (value < min) min = value;
      if (value > max) max = value;
    }

    // get chart
    try {
      var ctx = (document.getElementById('priceChart') as any).getContext("2d");

      // set custom x axis
      let xMin = Math.floor(min - (max - min) / 2);
      let xMax = Math.ceil(max + (max - min) / 2);

      // set gradient colour
      let gradientStroke = ctx.createLinearGradient(500, 0, 100, 0);
      gradientStroke.addColorStop(0, "#BA55D3");
      gradientStroke.addColorStop(1, "#481448");

      this.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              backgroundColor: gradientStroke,
              borderColor: gradientStroke,
              pointRadius: 0,
              data: incomeData
            }
          ]
        },
        options: {
          legend: {
            display: false
          },
          tooltips: {
            intersect: false,
            callbacks: {
              label: function (tooltipItem, data) {
                return tooltipItem.yLabel + ' Sats';
              }
            },
            displayColors: false
          },
          scales: {
            yAxes: [{
              display: false,
              ticks: {
                suggestedMin: xMin,
                suggestedMax: xMax,
                stepSize: 1
              }
            }],
            xAxes: [{
              display: false,
            }]
          }
        }
      });
    } catch (ex) {

    }
  }

  async monthIndexToName(index: number) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    return await this.translation.translate('MONTH.' + months[index])
  }

}
